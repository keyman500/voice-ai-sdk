import type Retell from 'retell-sdk';
import type { KnowledgeBaseManager } from '../../core/provider.js';
import type {
  KnowledgeBase,
  CreateKnowledgeBaseParams,
  ListKnowledgeBaseParams,
  PaginatedList,
  AddKnowledgeBaseSourcesParams,
} from '../../core/types.js';
import { ProviderError, NotFoundError, AuthenticationError } from '../../core/errors.js';
import { mapRetellKnowledgeBase } from './retell-mappers.js';

export class RetellKnowledgeBaseManager implements KnowledgeBaseManager {
  constructor(private readonly client: Retell) {}

  async create(params: CreateKnowledgeBaseParams): Promise<KnowledgeBase> {
    try {
      // Retell API rejects names >= 40 characters.
      const safeName =
        params.name.length > 39 ? params.name.slice(0, 39) : params.name;
      const dto: Record<string, unknown> = {
        knowledge_base_name: safeName,
      };
      if (params.providerOptions) {
        const options = params.providerOptions as Record<string, unknown>;
        // Support both raw Retell payload keys and normalized shortcuts.
        if (options.knowledge_base_urls) {
          dto.knowledge_base_urls = options.knowledge_base_urls;
        } else if (options.urls) {
          dto.knowledge_base_urls = options.urls;
        }
        if (options.knowledge_base_texts) {
          dto.knowledge_base_texts = options.knowledge_base_texts;
        } else if (options.texts) {
          dto.knowledge_base_texts = options.texts;
        }
        if (options.knowledge_base_files) {
          dto.knowledge_base_files = options.knowledge_base_files;
        } else if (options.files) {
          dto.knowledge_base_files = options.files;
        }

        for (const [key, value] of Object.entries(options)) {
          if (
            key !== 'knowledge_base_urls' &&
            key !== 'urls' &&
            key !== 'knowledge_base_texts' &&
            key !== 'texts' &&
            key !== 'knowledge_base_files' &&
            key !== 'files'
          ) {
            dto[key] = value;
          }
        }
      }
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

  /**
   * Retell-only: add URL, text, and/or file sources to an existing knowledge base.
   */
  async addSources(
    knowledgeBaseId: string,
    params: AddKnowledgeBaseSourcesParams,
  ): Promise<KnowledgeBase> {
    try {
      const body: Record<string, unknown> = {};
      if (params.urls?.length) body.knowledge_base_urls = params.urls;
      if (params.texts?.length) {
        body.knowledge_base_texts = params.texts.map((t) => ({
          title: t.title,
          text: t.text,
        }));
      }
      if (params.files?.length) body.knowledge_base_files = params.files;
      const result = await this.client.knowledgeBase.addSources(
        knowledgeBaseId,
        body as never,
      );
      return mapRetellKnowledgeBase(result as unknown as Record<string, unknown>);
    } catch (err) {
      throw this.wrapError(err, 'KnowledgeBase', knowledgeBaseId);
    }
  }

  /**
   * Retell-only: remove one source from a knowledge base.
   */
  async deleteSource(knowledgeBaseId: string, sourceId: string): Promise<KnowledgeBase> {
    try {
      const result = await this.client.knowledgeBase.deleteSource(
        knowledgeBaseId,
        sourceId,
      );
      return mapRetellKnowledgeBase(result as unknown as Record<string, unknown>);
    } catch (err) {
      throw this.wrapError(err, 'KnowledgeBase', knowledgeBaseId);
    }
  }

  /**
   * Retell-only: attach a knowledge base to a Retell LLM (merges with existing `knowledge_base_ids`).
   */
  async attachToRetellLlm(llmId: string, knowledgeBaseId: string): Promise<void> {
    try {
      const llm = await this.client.llm.retrieve(llmId);
      const rec = llm as unknown as Record<string, unknown>;
      const existing = (rec.knowledge_base_ids as string[] | null | undefined) ?? [];
      const merged = [...existing.filter(Boolean)];
      if (!merged.includes(knowledgeBaseId)) merged.push(knowledgeBaseId);
      await this.client.llm.update(llmId, { knowledge_base_ids: merged } as never);
    } catch (err) {
      throw this.wrapError(err, 'LLM', llmId);
    }
  }

  /**
   * Retell-only: remove a knowledge base ID from a Retell LLM.
   */
  async detachFromRetellLlm(llmId: string, knowledgeBaseId: string): Promise<void> {
    try {
      const llm = await this.client.llm.retrieve(llmId);
      const rec = llm as unknown as Record<string, unknown>;
      const existing = (rec.knowledge_base_ids as string[] | null | undefined) ?? [];
      const merged = existing.filter((id) => id && id !== knowledgeBaseId);
      await this.client.llm.update(llmId, { knowledge_base_ids: merged } as never);
    } catch (err) {
      throw this.wrapError(err, 'LLM', llmId);
    }
  }

  private wrapError(err: unknown, resource?: string, id?: string): Error {
    const status = (err as { status?: number }).status ?? (err as { statusCode?: number }).statusCode;
    if (status === 401) return new AuthenticationError('retell');
    if (status === 404 && resource && id) return new NotFoundError('retell', resource, id);
    return new ProviderError('retell', (err as Error).message ?? String(err), err);
  }
}
