import type Retell from 'retell-sdk';
import type { CallManager } from '../../core/provider.js';
import type {
  Call,
  CreateCallParams,
  UpdateCallParams,
  ListCallsParams,
  PaginatedList,
} from '../../core/types.js';
import { ProviderError, NotFoundError, AuthenticationError } from '../../core/errors.js';
import { mapRetellCallToCall, mapCreateCallToRetell } from './retell-mappers.js';

export class RetellCallManager implements CallManager {
  constructor(private readonly client: Retell) {}

  async create(params: CreateCallParams): Promise<Call> {
    try {
      const result = await this.client.call.createPhoneCall(mapCreateCallToRetell(params) as never);
      return mapRetellCallToCall(result as unknown as Record<string, unknown>);
    } catch (err) {
      throw this.wrapError(err);
    }
  }

  async list(params?: ListCallsParams): Promise<PaginatedList<Call>> {
    try {
      const opts: Record<string, unknown> = {};
      if (params?.limit) opts.limit = params.limit;
      const result = await this.client.call.list(opts as never);
      const items = (result as unknown as Record<string, unknown>[]).map(mapRetellCallToCall);
      return { items, hasMore: false };
    } catch (err) {
      throw this.wrapError(err);
    }
  }

  async get(id: string): Promise<Call> {
    try {
      const result = await this.client.call.retrieve(id);
      return mapRetellCallToCall(result as unknown as Record<string, unknown>);
    } catch (err) {
      throw this.wrapError(err, 'Call', id);
    }
  }

  async update(id: string, params: UpdateCallParams): Promise<Call> {
    try {
      const dto: Record<string, unknown> = {};
      if (params.metadata) dto.metadata = params.metadata;
      if (params.providerOptions) Object.assign(dto, params.providerOptions);
      const result = await this.client.call.update(id, dto as never);
      return mapRetellCallToCall(result as unknown as Record<string, unknown>);
    } catch (err) {
      throw this.wrapError(err);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.client.call.delete(id);
    } catch (err) {
      throw this.wrapError(err, 'Call', id);
    }
  }

  private wrapError(err: unknown, resource?: string, id?: string): Error {
    const status = (err as { status?: number }).status ?? (err as { statusCode?: number }).statusCode;
    if (status === 401) return new AuthenticationError('retell');
    if (status === 404 && resource && id) return new NotFoundError('retell', resource, id);
    return new ProviderError('retell', (err as Error).message ?? String(err), err);
  }
}
