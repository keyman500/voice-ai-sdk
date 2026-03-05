import { AccessToken } from 'livekit-server-sdk';
import type { PhoneNumberManager } from '../../core/provider.js';
import type {
  PhoneNumber,
  ListPhoneNumbersParams,
  CreatePhoneNumberParams,
  UpdatePhoneNumberParams,
  PaginatedList,
} from '../../core/types.js';
import { ProviderError, NotFoundError, AuthenticationError } from '../../core/errors.js';
import { mapLiveKitPhoneNumber, mapCreatePhoneNumberToLiveKit } from './livekit-mappers.js';

export class LiveKitPhoneNumberManager implements PhoneNumberManager {
  constructor(
    private readonly host: string,
    private readonly apiKey: string,
    private readonly secret: string,
  ) {}

  private async sipToken(): Promise<string> {
    const token = new AccessToken(this.apiKey, this.secret, { ttl: 600 });
    token.addSIPGrant({ admin: true });
    return token.toJwt();
  }

  private async twirp(method: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const jwt = await this.sipToken();
    const url = `${this.host}/twirp/livekit.PhoneNumberService/${method}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      const status = response.status;
      if (status === 401) throw Object.assign(new Error('Unauthorized'), { status: 401 });
      if (status === 404) throw Object.assign(new Error('Not found'), { status: 404 });
      throw Object.assign(new Error(text || `HTTP ${status}`), { status });
    }

    return response.json() as Promise<Record<string, unknown>>;
  }

  async list(_params?: ListPhoneNumbersParams): Promise<PaginatedList<PhoneNumber>> {
    try {
      const result = await this.twirp('ListPhoneNumbers', {});
      const numbers = (result['phone_numbers'] ?? result['phoneNumbers'] ?? []) as Record<string, unknown>[];
      const items = numbers.map(mapLiveKitPhoneNumber);
      return { items, hasMore: false };
    } catch (err) {
      throw this.wrapError(err);
    }
  }

  async get(id: string): Promise<PhoneNumber> {
    try {
      const result = await this.twirp('GetPhoneNumber', { id });
      const pn = (result['phone_number'] ?? result) as Record<string, unknown>;
      return mapLiveKitPhoneNumber(pn);
    } catch (err) {
      throw this.wrapError(err, 'PhoneNumber', id);
    }
  }

  async create(params: CreatePhoneNumberParams): Promise<PhoneNumber> {
    try {
      const dto = mapCreatePhoneNumberToLiveKit(params);
      const result = await this.twirp('PurchasePhoneNumber', dto);
      const pn = (result['phone_number'] ?? result) as Record<string, unknown>;
      return mapLiveKitPhoneNumber(pn);
    } catch (err) {
      throw this.wrapError(err);
    }
  }

  async update(id: string, params: UpdatePhoneNumberParams): Promise<PhoneNumber> {
    try {
      const dto: Record<string, unknown> = {};
      if (params.inboundAgentId) dto['sip_dispatch_rule_id'] = params.inboundAgentId;
      if (params.providerOptions) Object.assign(dto, params.providerOptions);
      dto['id'] = id; // Set last so providerOptions cannot overwrite the target ID
      const result = await this.twirp('UpdatePhoneNumber', dto);
      const pn = (result['phone_number'] ?? result) as Record<string, unknown>;
      return mapLiveKitPhoneNumber(pn);
    } catch (err) {
      throw this.wrapError(err, 'PhoneNumber', id);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.twirp('ReleasePhoneNumbers', { ids: [id] });
    } catch (err) {
      throw this.wrapError(err, 'PhoneNumber', id);
    }
  }

  private wrapError(err: unknown, resource?: string, id?: string): Error {
    const status = (err as { status?: number }).status ?? (err as { statusCode?: number }).statusCode;
    if (status === 401) return new AuthenticationError('livekit');
    if (status === 404 && resource && id) return new NotFoundError('livekit', resource, id);
    return new ProviderError('livekit', (err as Error).message ?? String(err), err);
  }
}
