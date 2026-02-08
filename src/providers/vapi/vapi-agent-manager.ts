import type { VapiClient } from '@vapi-ai/server-sdk';
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
  mapAssistantToAgent,
  mapCreateAgentToVapi,
  mapUpdateAgentToVapi,
} from './vapi-mappers.js';

export class VapiAgentManager implements AgentManager {
  constructor(private readonly client: VapiClient) {}

  async create(params: CreateAgentParams): Promise<Agent> {
    try {
      const result = await this.client.assistants.create(mapCreateAgentToVapi(params) as never);
      return mapAssistantToAgent(result as unknown as Record<string, unknown>);
    } catch (err) {
      throw this.wrapError(err);
    }
  }

  async list(params?: ListAgentsParams): Promise<PaginatedList<Agent>> {
    try {
      const opts: Record<string, unknown> = {};
      if (params?.limit) opts.limit = params.limit;
      const result = await this.client.assistants.list(opts as never);
      const items = (result as unknown as Record<string, unknown>[]).map(mapAssistantToAgent);
      return { items, hasMore: false };
    } catch (err) {
      throw this.wrapError(err);
    }
  }

  async get(id: string): Promise<Agent> {
    try {
      const result = await this.client.assistants.get({ id });
      return mapAssistantToAgent(result as unknown as Record<string, unknown>);
    } catch (err) {
      throw this.wrapError(err, 'Agent', id);
    }
  }

  async update(id: string, params: UpdateAgentParams): Promise<Agent> {
    try {
      const result = await this.client.assistants.update(mapUpdateAgentToVapi(id, params) as never);
      return mapAssistantToAgent(result as unknown as Record<string, unknown>);
    } catch (err) {
      throw this.wrapError(err);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.client.assistants.delete({ id });
    } catch (err) {
      throw this.wrapError(err, 'Agent', id);
    }
  }

  private wrapError(err: unknown, resource?: string, id?: string): Error {
    const status = (err as { statusCode?: number }).statusCode ?? (err as { status?: number }).status;
    if (status === 401) return new AuthenticationError('vapi');
    if (status === 404 && resource && id) return new NotFoundError('vapi', resource, id);
    return new ProviderError('vapi', (err as Error).message ?? String(err), err);
  }
}
