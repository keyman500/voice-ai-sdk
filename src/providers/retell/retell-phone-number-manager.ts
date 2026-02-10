import type Retell from 'retell-sdk';
import type { PhoneNumberManager } from '../../core/provider.js';
import type {
  PhoneNumber,
  ListPhoneNumbersParams,
  CreatePhoneNumberParams,
  UpdatePhoneNumberParams,
  PaginatedList,
} from '../../core/types.js';
import { ProviderError, NotFoundError, AuthenticationError } from '../../core/errors.js';
import {
  mapRetellPhoneNumber,
  mapCreatePhoneNumberToRetell,
  mapUpdatePhoneNumberToRetell,
} from './retell-mappers.js';

export class RetellPhoneNumberManager implements PhoneNumberManager {
  constructor(private readonly client: Retell) {}

  async list(params?: ListPhoneNumbersParams): Promise<PaginatedList<PhoneNumber>> {
    try {
      const result = await this.client.phoneNumber.list();
      let items = (result as unknown as Record<string, unknown>[]).map(mapRetellPhoneNumber);
      if (params?.limit) {
        items = items.slice(0, params.limit);
      }
      return { items, hasMore: false };
    } catch (err) {
      throw this.wrapError(err);
    }
  }

  async get(id: string): Promise<PhoneNumber> {
    try {
      const result = await this.client.phoneNumber.retrieve(id);
      return mapRetellPhoneNumber(result as unknown as Record<string, unknown>);
    } catch (err) {
      throw this.wrapError(err, 'PhoneNumber', id);
    }
  }

  async create(params: CreatePhoneNumberParams): Promise<PhoneNumber> {
    try {
      const dto = mapCreatePhoneNumberToRetell(params);
      const result = await this.client.phoneNumber.create(dto as never);
      return mapRetellPhoneNumber(result as unknown as Record<string, unknown>);
    } catch (err) {
      throw this.wrapError(err);
    }
  }

  async update(id: string, params: UpdatePhoneNumberParams): Promise<PhoneNumber> {
    try {
      const dto = mapUpdatePhoneNumberToRetell(params);
      const result = await this.client.phoneNumber.update(id, dto as never);
      return mapRetellPhoneNumber(result as unknown as Record<string, unknown>);
    } catch (err) {
      throw this.wrapError(err);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.client.phoneNumber.delete(id);
    } catch (err) {
      throw this.wrapError(err, 'PhoneNumber', id);
    }
  }

  private wrapError(err: unknown, resource?: string, id?: string): Error {
    const status = (err as { status?: number }).status ?? (err as { statusCode?: number }).statusCode;
    if (status === 401) return new AuthenticationError('retell');
    if (status === 404 && resource && id) return new NotFoundError('retell', resource, id);
    return new ProviderError('retell', (err as Error).message ?? String(err), err);
  }
}
