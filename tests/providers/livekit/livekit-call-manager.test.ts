jest.mock('livekit-server-sdk');

import { SipClient, RoomServiceClient, AgentDispatchClient } from 'livekit-server-sdk';
import { createLiveKit } from '../../../src/providers/livekit';
import { ProviderError, AuthenticationError } from '../../../src/core/errors';
import type { LiveKitProvider } from '../../../src/providers/livekit/livekit-provider';

const MockedSipClient = SipClient as jest.MockedClass<typeof SipClient>;
const MockedRoomService = RoomServiceClient as jest.MockedClass<typeof RoomServiceClient>;
const MockedAgentDispatch = AgentDispatchClient as jest.MockedClass<typeof AgentDispatchClient>;

const sampleParticipant = {
  participantId: 'p1',
  participantIdentity: 'sip_+14155551234',
  roomName: 'call-room-1',
  sipCallId: 'sip_1',
};

const sampleRoom = {
  name: 'call-room-1',
  creationTimeMs: BigInt(1700000000000),
  creationTime: BigInt(0),
  numParticipants: 2,
};

let mockSip: Record<string, jest.Mock>;
let mockRoom: Record<string, jest.Mock>;
let mockAgent: Record<string, jest.Mock>;

beforeEach(() => {
  jest.clearAllMocks();
  mockSip = {
    createSipDispatchRule: jest.fn(),
    listSipDispatchRule: jest.fn(),
    updateSipDispatchRuleFields: jest.fn(),
    deleteSipDispatchRule: jest.fn(),
    createSipParticipant: jest.fn(),
    listSipInboundTrunk: jest.fn(),
    listSipOutboundTrunk: jest.fn(),
    createSipInboundTrunk: jest.fn(),
    createSipOutboundTrunk: jest.fn(),
    deleteSipTrunk: jest.fn(),
  };
  mockRoom = {
    listRooms: jest.fn(),
    deleteRoom: jest.fn(),
    createRoom: jest.fn(),
  };
  mockAgent = {
    createDispatch: jest.fn(),
    deleteDispatch: jest.fn(),
    getDispatch: jest.fn(),
    listDispatch: jest.fn(),
  };
  MockedSipClient.mockImplementation(() => mockSip as unknown as SipClient);
  MockedRoomService.mockImplementation(() => mockRoom as unknown as RoomServiceClient);
  MockedAgentDispatch.mockImplementation(() => mockAgent as unknown as AgentDispatchClient);
});

describe('LiveKitCallManager', () => {
  describe('create', () => {
    it('creates a SIP participant and returns unified call', async () => {
      mockSip.createSipParticipant.mockResolvedValue(sampleParticipant);
      const provider = createLiveKit({ apiKey: 'key', secret: 'secret', host: 'https://x' });

      const call = await provider.calls.create({
        toNumber: '+14155551234',
        providerOptions: { trunkId: 'trunk_1', roomName: 'call-room-1' },
      });

      expect(call.id).toBe('call-room-1');
      expect(call.provider).toBe('livekit');
      expect(call.status).toBe('in-progress');
      expect(mockSip.createSipParticipant).toHaveBeenCalledWith(
        'trunk_1',
        '+14155551234',
        'call-room-1',
        expect.objectContaining({ fromNumber: undefined }),
      );
    });

    it('auto-generates roomName when not provided', async () => {
      mockSip.createSipParticipant.mockResolvedValue({ ...sampleParticipant, roomName: 'auto' });
      const provider = createLiveKit({ apiKey: 'k', secret: 's', host: 'https://x' });

      await provider.calls.create({
        toNumber: '+14155551234',
        providerOptions: { trunkId: 'trunk_1' },
      });

      const [, , roomName] = mockSip.createSipParticipant.mock.calls[0];
      expect(roomName).toMatch(/^call-\d+-[a-z0-9]+$/);
    });

    it('dispatches agent when agentName is provided', async () => {
      mockSip.createSipParticipant.mockResolvedValue(sampleParticipant);
      mockAgent.createDispatch.mockResolvedValue({});
      const provider = createLiveKit({ apiKey: 'k', secret: 's', host: 'https://x' });

      await provider.calls.create({
        toNumber: '+14155551234',
        providerOptions: { trunkId: 'trunk_1', roomName: 'call-room-1', agentName: 'my-agent' },
      });

      expect(mockAgent.createDispatch).toHaveBeenCalledWith('call-room-1', 'my-agent');
    });

    it('throws ProviderError when trunkId is missing', async () => {
      const provider = createLiveKit({ apiKey: 'k', secret: 's', host: 'https://x' });
      await expect(
        provider.calls.create({ toNumber: '+14155551234' }),
      ).rejects.toThrow(ProviderError);
    });

    it('wraps 401 as AuthenticationError', async () => {
      const err = Object.assign(new Error('unauthorized'), { status: 401 });
      mockSip.createSipParticipant.mockRejectedValue(err);
      const provider = createLiveKit({ apiKey: 'k', secret: 's', host: 'https://x' });
      await expect(
        provider.calls.create({ toNumber: '+1', providerOptions: { trunkId: 't' } }),
      ).rejects.toThrow(AuthenticationError);
    });
  });

  describe('list', () => {
    it('throws ProviderError with helpful message', async () => {
      const provider = createLiveKit({ apiKey: 'k', secret: 's', host: 'https://x' });
      await expect(provider.calls.list()).rejects.toThrow(ProviderError);
      await expect(provider.calls.list()).rejects.toThrow('listActive()');
    });
  });

  describe('get', () => {
    it('throws ProviderError with helpful message', async () => {
      const provider = createLiveKit({ apiKey: 'k', secret: 's', host: 'https://x' });
      await expect(provider.calls.get('room-1')).rejects.toThrow(ProviderError);
      await expect(provider.calls.get('room-1')).rejects.toThrow('call history');
    });
  });

  describe('update', () => {
    it('throws ProviderError', async () => {
      const provider = createLiveKit({ apiKey: 'k', secret: 's', host: 'https://x' });
      await expect(provider.calls.update('room-1', {})).rejects.toThrow(ProviderError);
    });
  });

  describe('delete', () => {
    it('deletes room to end the call', async () => {
      mockRoom.deleteRoom.mockResolvedValue(undefined);
      const provider = createLiveKit({ apiKey: 'k', secret: 's', host: 'https://x' });

      await provider.calls.delete('call-room-1');
      expect(mockRoom.deleteRoom).toHaveBeenCalledWith('call-room-1');
    });

    it('wraps errors as ProviderError', async () => {
      mockRoom.deleteRoom.mockRejectedValue(new Error('failed'));
      const provider = createLiveKit({ apiKey: 'k', secret: 's', host: 'https://x' });
      await expect(provider.calls.delete('room-1')).rejects.toThrow(ProviderError);
    });
  });

  describe('listActive', () => {
    it('returns active rooms as calls', async () => {
      mockRoom.listRooms.mockResolvedValue([sampleRoom]);
      const provider = createLiveKit({ apiKey: 'k', secret: 's', host: 'https://x' }) as LiveKitProvider;

      const result = await provider.calls.listActive();
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('call-room-1');
      expect(result.items[0].status).toBe('in-progress');
      expect(result.hasMore).toBe(false);
    });

    it('returns empty list when no active rooms', async () => {
      mockRoom.listRooms.mockResolvedValue([]);
      const provider = createLiveKit({ apiKey: 'k', secret: 's', host: 'https://x' }) as LiveKitProvider;

      const result = await provider.calls.listActive();
      expect(result.items).toEqual([]);
    });
  });
});
