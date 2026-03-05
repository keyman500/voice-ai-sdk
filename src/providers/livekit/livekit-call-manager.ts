import type { SipClient, RoomServiceClient } from 'livekit-server-sdk';
import { TwirpError } from 'livekit-server-sdk';
import type { AgentDispatchClient } from 'livekit-server-sdk';
import type { CallManager } from '../../core/provider.js';
import type {
  Call,
  CreateCallParams,
  UpdateCallParams,
  ListCallsParams,
  PaginatedList,
} from '../../core/types.js';
import { ProviderError, AuthenticationError } from '../../core/errors.js';
import { mapSipParticipantToCall, mapRoomToCall } from './livekit-mappers.js';

export class LiveKitCallManager implements CallManager {
  constructor(
    private readonly sipClient: SipClient,
    private readonly roomService: RoomServiceClient,
    private readonly agentDispatch: AgentDispatchClient,
  ) {}

  async create(params: CreateCallParams): Promise<Call> {
    try {
      const trunkId = params.providerOptions?.['trunkId'] as string | undefined;
      if (!trunkId) {
        throw new ProviderError('livekit', 'providerOptions.trunkId is required to create a call');
      }
      const roomName =
        (params.providerOptions?.['roomName'] as string | undefined) ??
        `call-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const result = await this.sipClient.createSipParticipant(
        trunkId,
        params.toNumber,
        roomName,
        {
          fromNumber: params.fromNumber,
          participantMetadata: params.metadata ? JSON.stringify(params.metadata) : undefined,
        },
      );

      // If an agentId (dispatch rule ID) is supplied, also resolve the agent name
      // and dispatch it into the room. agentName can be passed via providerOptions.
      const agentName = params.providerOptions?.['agentName'] as string | undefined;
      if (agentName) {
        await this.agentDispatch.createDispatch(roomName, agentName);
      }

      return mapSipParticipantToCall(result);
    } catch (err) {
      throw this.wrapError(err);
    }
  }

  async list(_params?: ListCallsParams): Promise<PaginatedList<Call>> {
    throw new ProviderError(
      'livekit',
      'list() is not supported for LiveKit — use listActive() to get in-progress calls',
    );
  }

  async get(_id: string): Promise<Call> {
    throw new ProviderError(
      'livekit',
      'get() is not supported for LiveKit — LiveKit has no call history API',
    );
  }

  async update(_id: string, _params: UpdateCallParams): Promise<Call> {
    throw new ProviderError(
      'livekit',
      'update() is not supported for LiveKit calls',
    );
  }

  async delete(id: string): Promise<void> {
    try {
      await this.roomService.deleteRoom(id);
    } catch (err) {
      throw this.wrapError(err);
    }
  }

  /** LiveKit-specific: returns all currently active calls (in-progress rooms). */
  async listActive(): Promise<PaginatedList<Call>> {
    try {
      const rooms = await this.roomService.listRooms();
      const items = rooms.map(mapRoomToCall);
      return { items, hasMore: false };
    } catch (err) {
      throw this.wrapError(err);
    }
  }

  private wrapError(err: unknown): Error {
    if (err instanceof ProviderError) return err;
    const status =
      err instanceof TwirpError
        ? err.status
        : (err as { status?: number }).status ?? (err as { statusCode?: number }).statusCode;
    if (status === 401) return new AuthenticationError('livekit');
    return new ProviderError('livekit', (err as Error).message ?? String(err), err);
  }
}
