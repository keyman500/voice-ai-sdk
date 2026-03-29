import type Retell from 'retell-sdk';
import type { CampaignManager } from '../../core/provider.js';
import type {
  Campaign,
  CreateCampaignParams,
  ListCampaignsParams,
  PaginatedList,
  UpdateCampaignParams,
} from '../../core/types.js';
import { AuthenticationError, ProviderError } from '../../core/errors.js';
import {
  mapCreateCampaignToRetellBatchCall,
  mapRetellBatchCallToCampaign,
} from './retell-mappers.js';

export class RetellCampaignManager implements CampaignManager {
  constructor(private readonly client: Retell) {}

  async create(params: CreateCampaignParams): Promise<Campaign> {
    try {
      const result = await this.client.batchCall.createBatchCall(
        mapCreateCampaignToRetellBatchCall(params) as never,
      );
      const mapped = mapRetellBatchCallToCampaign(
        result as unknown as Record<string, unknown>,
      );
      return {
        ...mapped,
        agentId: mapped.agentId ?? params.agentId,
        fromNumber: mapped.fromNumber ?? params.fromNumber,
        recipientCount:
          mapped.recipientCount > 0 ? mapped.recipientCount : params.tasks.length,
      };
    } catch (err) {
      throw this.wrapError(err);
    }
  }

  async list(_params?: ListCampaignsParams): Promise<PaginatedList<Campaign>> {
    throw new ProviderError(
      'retell',
      'Campaign list is not supported by Retell batch-call API yet.',
    );
  }

  async get(_id: string): Promise<Campaign> {
    throw new ProviderError(
      'retell',
      'Campaign retrieve is not supported by Retell batch-call API yet.',
    );
  }

  async update(_id: string, _params: UpdateCampaignParams): Promise<Campaign> {
    throw new ProviderError(
      'retell',
      'Campaign update is not supported by Retell batch-call API yet.',
    );
  }

  async delete(_id: string): Promise<void> {
    throw new ProviderError(
      'retell',
      'Campaign delete is not supported by Retell batch-call API yet.',
    );
  }

  private wrapError(err: unknown): Error {
    const status =
      (err as { status?: number }).status ??
      (err as { statusCode?: number }).statusCode;
    if (status === 401) return new AuthenticationError('retell');
    return new ProviderError('retell', (err as Error).message ?? String(err), err);
  }
}
