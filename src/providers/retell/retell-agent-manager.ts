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
      return mapRetellAgentToAgent(result as unknown as Record<string, unknown>);
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
      return mapRetellAgentToAgent(result as unknown as Record<string, unknown>);
    } catch (err) {
      throw this.wrapError(err, 'Agent', id);
    }
  }

  async update(id: string, params: UpdateAgentParams): Promise<Agent> {
    try {
      const result = await this.client.agent.update(id, mapUpdateAgentToRetell(params) as never);
      return mapRetellAgentToAgent(result as unknown as Record<string, unknown>);
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

  private wrapError(err: unknown, resource?: string, id?: string): Error {
    const status = (err as { status?: number }).status ?? (err as { statusCode?: number }).statusCode;
    if (status === 401) return new AuthenticationError('retell');
    if (status === 404 && resource && id) return new NotFoundError('retell', resource, id);
    return new ProviderError('retell', (err as Error).message ?? String(err), err);
  }
}
