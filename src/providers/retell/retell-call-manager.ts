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
      if (params) {
        const unsupported = getUnsupportedRetellListParams(params);
        if (unsupported.length > 0) {
          throw new ProviderError(
            'retell',
            `Unsupported list params: ${unsupported.join(', ')}`,
          );
        }
        if (params.limit) opts.limit = params.limit;
        if (params.cursor) opts.pagination_key = params.cursor;

        const filter: Record<string, unknown> = {};
        if (params.agentId) filter.agent_id = [params.agentId];
        if (params.callStatus) filter.call_status = [params.callStatus];
        if (params.callType) filter.call_type = [params.callType];
        if (params.direction) filter.direction = [params.direction];
        if (params.userSentiment) filter.user_sentiment = [params.userSentiment];
        if (params.callSuccessful !== undefined)
          filter.call_successful = [params.callSuccessful];

        if (params.startTime) {
          filter.start_timestamp = {
            lower_threshold: toTimestampMs(params.startTime, 'startTime'),
          };
        }

        if (params.endTime) {
          filter.end_timestamp = {
            upper_threshold: toTimestampMs(params.endTime, 'endTime'),
          };
        }

        if (params.metadata) {
          for (const [key, value] of Object.entries(params.metadata)) {
            filter[`metadata.${key}`] = [value];
          }
        }

        if (params.dynamicVariables) {
          for (const [key, value] of Object.entries(params.dynamicVariables)) {
            filter[`dynamic_variables.${key}`] = [value];
          }
        }

        if (Object.keys(filter).length > 0) opts.filter_criteria = filter;

        if (params.sort) {
          opts.sort_order = params.sort.order === 'asc' ? 'ascending' : 'descending';
        }

        if (params.providerOptions) Object.assign(opts, params.providerOptions);
      }
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

const getUnsupportedRetellListParams = (params: ListCallsParams): string[] => {
  const unsupported: string[] = [];
  if (params.phoneNumberId) unsupported.push('phoneNumberId');
  if (params.sort?.field && params.sort.field !== 'startTime') unsupported.push('sort.field');
  return unsupported;
};

const toTimestampMs = (value: string, label: string): number => {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    throw new ProviderError('retell', `Invalid ${label}. Expected ISO timestamp.`);
  }
  return parsed;
};
