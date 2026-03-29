import type Retell from 'retell-sdk';
import type { AgentManager } from '../../core/provider.js';
import type {
  Agent,
  CreateAgentParams,
  UpdateAgentParams,
  ListAgentsParams,
  PaginatedList,
} from '../../core/types.js';
import { ProviderError, NotFoundError, AuthenticationError } from '../../core/errors.js';
import {
  mapRetellAgentToAgent,
  mapCreateAgentToRetell,
  mapUpdateAgentToRetell,
} from './retell-mappers.js';

export class RetellAgentManager implements AgentManager {
  constructor(private readonly client: Retell) {}

  async create(params: CreateAgentParams): Promise<Agent> {
    try {
      const result = await this.client.agent.create(mapCreateAgentToRetell(params) as never);
      const mapped = mapRetellAgentToAgent(result as unknown as Record<string, unknown>);

      if (params.model?.provider === 'retell-llm' && params.model.model) {
        const llmPatch: Record<string, unknown> = {};
        if (params.firstMessage !== undefined) {
          llmPatch.begin_message = params.firstMessage;
        }
        if (params.model.systemPrompt !== undefined) {
          llmPatch.general_prompt = params.model.systemPrompt;
        }
        if (Object.keys(llmPatch).length > 0) {
          await this.client.llm.update(params.model.model, llmPatch as never);
        }
      }

      return await this.hydrateAgent(mapped);
    } catch (err) {
      throw this.wrapError(err);
    }
  }

  async list(params?: ListAgentsParams): Promise<PaginatedList<Agent>> {
    try {
      const result = await this.client.agent.list();
      let items = (result as unknown as Record<string, unknown>[]).map(mapRetellAgentToAgent);
      if (params?.limit) {
        items = items.slice(0, params.limit);
      }
      return { items, hasMore: false };
    } catch (err) {
      throw this.wrapError(err);
    }
  }

  async get(id: string): Promise<Agent> {
    try {
      const result = await this.client.agent.retrieve(id);
      return await this.hydrateAgent(
        mapRetellAgentToAgent(result as unknown as Record<string, unknown>),
      );
    } catch (err) {
      throw this.wrapError(err, 'Agent', id);
    }
  }

  async update(id: string, params: UpdateAgentParams): Promise<Agent> {
    try {
      let targetEngineType: string | undefined = params.model?.provider;

      if (params.firstMessage !== undefined && targetEngineType === undefined) {
        const existing = await this.client.agent.retrieve(id);
        const ex = existing as unknown as Record<string, unknown>;
        const exEng = ex.response_engine as Record<string, unknown> | undefined;
        targetEngineType = exEng?.type as string | undefined;
      }

      const omitBeginOnAgent =
        params.firstMessage !== undefined && targetEngineType === 'retell-llm';

      const paramsForMapper = omitBeginOnAgent
        ? { ...params, firstMessage: undefined }
        : params;

      const result = await this.client.agent.update(
        id,
        mapUpdateAgentToRetell(paramsForMapper) as never,
      );
      const updated = result as unknown as Record<string, unknown>;
      const newEng = updated.response_engine as Record<string, unknown> | undefined;

      if (newEng?.type === 'retell-llm') {
        const llmId = newEng.llm_id as string | undefined;
        if (!llmId) {
          throw new ProviderError(
            'retell',
            'retell-llm response_engine is missing llm_id',
          );
        }
        const llmPatch: Record<string, unknown> = {};
        if (params.firstMessage !== undefined) {
          llmPatch.begin_message = params.firstMessage;
        }
        if (params.model?.systemPrompt !== undefined) {
          llmPatch.general_prompt = params.model.systemPrompt;
        }
        if (Object.keys(llmPatch).length > 0) {
          await this.client.llm.update(llmId, llmPatch as never);
        }
      }

      return await this.hydrateAgent(mapRetellAgentToAgent(updated));
    } catch (err) {
      throw this.wrapError(err);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.client.agent.delete(id);
    } catch (err) {
      throw this.wrapError(err, 'Agent', id);
    }
  }

  /**
   * Fills `firstMessage` from Retell LLM when the agent uses `retell-llm` response engine.
   */
  private async hydrateAgent(agent: Agent): Promise<Agent> {
    const raw = agent.raw as Record<string, unknown>;
    const engine = raw.response_engine as Record<string, unknown> | undefined;
    if (engine?.type !== 'retell-llm' || engine.llm_id == null || engine.llm_id === '') {
      return agent;
    }
    try {
      const llmId = engine.llm_id as string;
      const llm = await this.client.llm.retrieve(llmId);
      const llmRec = llm as unknown as Record<string, unknown>;
      const begin = llmRec.begin_message as string | undefined;
      const general = llmRec.general_prompt as string | undefined;
      const rawKbIds = llmRec.knowledge_base_ids as string[] | null | undefined;
      const knowledgeBaseIds = rawKbIds?.filter((id): id is string => Boolean(id)) ?? [];
      return {
        ...agent,
        firstMessage: begin,
        model: agent.model
          ? {
              ...agent.model,
              systemPrompt: general ?? agent.model.systemPrompt,
              knowledgeBaseIds,
            }
          : undefined,
      };
    } catch (err) {
      throw this.wrapError(err);
    }
  }

  private wrapError(err: unknown, resource?: string, id?: string): Error {
    const status = (err as { status?: number }).status ?? (err as { statusCode?: number }).statusCode;
    if (status === 401) return new AuthenticationError('retell');
    if (status === 404 && resource && id) return new NotFoundError('retell', resource, id);
    return new ProviderError('retell', (err as Error).message ?? String(err), err);
  }
}
