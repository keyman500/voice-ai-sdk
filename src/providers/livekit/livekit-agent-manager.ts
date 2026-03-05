import type { SipClient } from 'livekit-server-sdk';
import { TwirpError } from 'livekit-server-sdk';
import type { AgentManager } from '../../core/provider.js';
import type { Agent, CreateAgentParams, UpdateAgentParams, ListAgentsParams, PaginatedList } from '../../core/types.js';
import { ProviderError, NotFoundError, AuthenticationError } from '../../core/errors.js';
import { mapDispatchRuleToAgent, mapCreateAgentToLiveKit, mapUpdateAgentToLiveKit } from './livekit-mappers.js';

export class LiveKitAgentManager implements AgentManager {
  constructor(private readonly sipClient: SipClient) {}

  async create(params: CreateAgentParams): Promise<Agent> {
    try {
      const { rule, opts } = mapCreateAgentToLiveKit(params);
      const result = await this.sipClient.createSipDispatchRule(rule, opts);
      return mapDispatchRuleToAgent(result);
    } catch (err) {
      throw this.wrapError(err);
    }
  }

  async list(params?: ListAgentsParams): Promise<PaginatedList<Agent>> {
    try {
      const opts: Record<string, unknown> = {};
      if (params?.limit) opts['page'] = { limit: params.limit };
      const results = await this.sipClient.listSipDispatchRule(opts as never);
      const items = results.map(mapDispatchRuleToAgent);
      return { items, hasMore: false };
    } catch (err) {
      throw this.wrapError(err);
    }
  }

  async get(id: string): Promise<Agent> {
    try {
      const results = await this.sipClient.listSipDispatchRule({ dispatchRuleIds: [id] });
      const rule = results.find(r => r.sipDispatchRuleId === id);
      if (!rule) throw Object.assign(new Error('not found'), { status: 404 });
      return mapDispatchRuleToAgent(rule);
    } catch (err) {
      throw this.wrapError(err, 'Agent', id);
    }
  }

  async update(id: string, params: UpdateAgentParams): Promise<Agent> {
    try {
      const fields = mapUpdateAgentToLiveKit(params);
      const result = await this.sipClient.updateSipDispatchRuleFields(id, fields);
      return mapDispatchRuleToAgent(result);
    } catch (err) {
      throw this.wrapError(err);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.sipClient.deleteSipDispatchRule(id);
    } catch (err) {
      throw this.wrapError(err, 'Agent', id);
    }
  }

  private wrapError(err: unknown, resource?: string, id?: string): Error {
    const status =
      err instanceof TwirpError
        ? err.status
        : (err as { status?: number }).status ?? (err as { statusCode?: number }).statusCode;
    if (status === 401) return new AuthenticationError('livekit');
    if (status === 404 && resource && id) return new NotFoundError('livekit', resource, id);
    return new ProviderError('livekit', (err as Error).message ?? String(err), err);
  }
}
