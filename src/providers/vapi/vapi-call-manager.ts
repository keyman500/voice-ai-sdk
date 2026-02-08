import type { VapiClient } from '@vapi-ai/server-sdk';
import type { CallManager } from '../../core/provider.js';
import type {
  Call,
  CreateCallParams,
  UpdateCallParams,
  ListCallsParams,
  PaginatedList,
} from '../../core/types.js';
import { ProviderError, NotFoundError, AuthenticationError } from '../../core/errors.js';
import { mapVapiCallToCall, mapCreateCallToVapi } from './vapi-mappers.js';

export class VapiCallManager implements CallManager {
  constructor(private readonly client: VapiClient) {}

  async create(params: CreateCallParams): Promise<Call> {
    try {
      const result = await this.client.calls.create(mapCreateCallToVapi(params) as never);
      return mapVapiCallToCall(result as unknown as Record<string, unknown>);
    } catch (err) {
      throw this.wrapError(err);
    }
  }

  async list(params?: ListCallsParams): Promise<PaginatedList<Call>> {
    try {
      const opts: Record<string, unknown> = {};
      if (params?.limit) opts.limit = params.limit;
      const result = await this.client.calls.list(opts as never);
      const items = (result as unknown as Record<string, unknown>[]).map(mapVapiCallToCall);
      return { items, hasMore: false };
    } catch (err) {
      throw this.wrapError(err);
    }
  }

  async get(id: string): Promise<Call> {
    try {
      const result = await this.client.calls.get({ id });
      return mapVapiCallToCall(result as unknown as Record<string, unknown>);
    } catch (err) {
      throw this.wrapError(err, 'Call', id);
    }
  }

  async update(id: string, params: UpdateCallParams): Promise<Call> {
    try {
      const dto: Record<string, unknown> = { id };
      if (params.providerOptions) Object.assign(dto, params.providerOptions);
      const result = await this.client.calls.update(dto as never);
      return mapVapiCallToCall(result as unknown as Record<string, unknown>);
    } catch (err) {
      throw this.wrapError(err);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.client.calls.delete({ id });
    } catch (err) {
      throw this.wrapError(err, 'Call', id);
    }
  }

  private wrapError(err: unknown, resource?: string, id?: string): Error {
    const status = (err as { statusCode?: number }).statusCode ?? (err as { status?: number }).status;
    if (status === 401) return new AuthenticationError('vapi');
    if (status === 404 && resource && id) return new NotFoundError('vapi', resource, id);
    return new ProviderError('vapi', (err as Error).message ?? String(err), err);
  }
}
