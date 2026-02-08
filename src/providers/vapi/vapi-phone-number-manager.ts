import type { VapiClient } from '@vapi-ai/server-sdk';
import type { PhoneNumberManager } from '../../core/provider.js';
import type {
  PhoneNumber,
  ListPhoneNumbersParams,
  PaginatedList,
} from '../../core/types.js';
import { ProviderError, NotFoundError, AuthenticationError } from '../../core/errors.js';
import { mapVapiPhoneNumber } from './vapi-mappers.js';

export class VapiPhoneNumberManager implements PhoneNumberManager {
  constructor(private readonly client: VapiClient) {}

  async list(params?: ListPhoneNumbersParams): Promise<PaginatedList<PhoneNumber>> {
    try {
      const opts: Record<string, unknown> = {};
      if (params?.limit) opts.limit = params.limit;
      const result = await this.client.phoneNumbers.list(opts as never);
      const items = (result as unknown as Record<string, unknown>[]).map(mapVapiPhoneNumber);
      return { items, hasMore: false };
    } catch (err) {
      throw this.wrapError(err);
    }
  }

  async get(id: string): Promise<PhoneNumber> {
    try {
      const result = await this.client.phoneNumbers.get({ id });
      return mapVapiPhoneNumber(result as unknown as Record<string, unknown>);
    } catch (err) {
      throw this.wrapError(err, 'PhoneNumber', id);
    }
  }

  private wrapError(err: unknown, resource?: string, id?: string): Error {
    const status = (err as { statusCode?: number }).statusCode ?? (err as { status?: number }).status;
    if (status === 401) return new AuthenticationError('vapi');
    if (status === 404 && resource && id) return new NotFoundError('vapi', resource, id);
    return new ProviderError('vapi', (err as Error).message ?? String(err), err);
  }
}
