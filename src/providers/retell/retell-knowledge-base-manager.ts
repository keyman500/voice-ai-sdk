import type Retell from 'retell-sdk';
import type { KnowledgeBaseManager } from '../../core/provider.js';
import type {
  KnowledgeBase,
  CreateKnowledgeBaseParams,
  ListKnowledgeBaseParams,
  PaginatedList,
} from '../../core/types.js';
import { ProviderError, NotFoundError, AuthenticationError } from '../../core/errors.js';
import { mapRetellKnowledgeBase } from './retell-mappers.js';

export class RetellKnowledgeBaseManager implements KnowledgeBaseManager {
  constructor(private readonly client: Retell) {}

  async create(params: CreateKnowledgeBaseParams): Promise<KnowledgeBase> {
    try {
      const dto: Record<string, unknown> = {
        knowledge_base_name: params.name,
      };
      if (params.providerOptions) Object.assign(dto, params.providerOptions);
      const result = await this.client.knowledgeBase.create(dto as never);
      return mapRetellKnowledgeBase(result as unknown as Record<string, unknown>);
    } catch (err) {
      throw this.wrapError(err);
    }
  }

  async list(_params?: ListKnowledgeBaseParams): Promise<PaginatedList<KnowledgeBase>> {
    try {
      const result = await this.client.knowledgeBase.list();
      const items = (result as unknown as Record<string, unknown>[]).map(mapRetellKnowledgeBase);
      return { items, hasMore: false };
    } catch (err) {
      throw this.wrapError(err);
    }
  }

  async get(id: string): Promise<KnowledgeBase> {
    try {
      const result = await this.client.knowledgeBase.retrieve(id);
      return mapRetellKnowledgeBase(result as unknown as Record<string, unknown>);
    } catch (err) {
      throw this.wrapError(err, 'KnowledgeBase', id);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.client.knowledgeBase.delete(id);
    } catch (err) {
      throw this.wrapError(err, 'KnowledgeBase', id);
    }
  }

  private wrapError(err: unknown, resource?: string, id?: string): Error {
    const status = (err as { status?: number }).status ?? (err as { statusCode?: number }).statusCode;
    if (status === 401) return new AuthenticationError('retell');
    if (status === 404 && resource && id) return new NotFoundError('retell', resource, id);
    return new ProviderError('retell', (err as Error).message ?? String(err), err);
  }
}
