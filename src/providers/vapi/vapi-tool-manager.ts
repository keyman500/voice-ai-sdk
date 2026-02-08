import type { VapiClient } from '@vapi-ai/server-sdk';
import type { ToolManager } from '../../core/provider.js';
import type {
  Tool,
  CreateToolParams,
  UpdateToolParams,
  ListToolsParams,
  PaginatedList,
} from '../../core/types.js';
import { ProviderError, NotFoundError, AuthenticationError } from '../../core/errors.js';
import { mapVapiToolToTool } from './vapi-mappers.js';

export class VapiToolManager implements ToolManager {
  constructor(private readonly client: VapiClient) {}

  async create(params: CreateToolParams): Promise<Tool> {
    try {
      const dto: Record<string, unknown> = { type: params.type };
      if (params.name || params.description) {
        dto.function = {
          name: params.name,
          description: params.description,
        };
      }
      if (params.providerOptions) Object.assign(dto, params.providerOptions);
      const result = await this.client.tools.create(dto as never);
      return mapVapiToolToTool(result as unknown as Record<string, unknown>);
    } catch (err) {
      throw this.wrapError(err);
    }
  }

  async list(params?: ListToolsParams): Promise<PaginatedList<Tool>> {
    try {
      const opts: Record<string, unknown> = {};
      if (params?.limit) opts.limit = params.limit;
      const result = await this.client.tools.list(opts as never);
      const items = (result as unknown as Record<string, unknown>[]).map(mapVapiToolToTool);
      return { items, hasMore: false };
    } catch (err) {
      throw this.wrapError(err);
    }
  }

  async get(id: string): Promise<Tool> {
    try {
      const result = await this.client.tools.get({ id });
      return mapVapiToolToTool(result as unknown as Record<string, unknown>);
    } catch (err) {
      throw this.wrapError(err, 'Tool', id);
    }
  }

  async update(id: string, params: UpdateToolParams): Promise<Tool> {
    try {
      const body: Record<string, unknown> = {};
      if (params.name || params.description) {
        body.function = {
          name: params.name,
          description: params.description,
        };
      }
      if (params.providerOptions) Object.assign(body, params.providerOptions);
      const result = await this.client.tools.update({ id, body } as never);
      return mapVapiToolToTool(result as unknown as Record<string, unknown>);
    } catch (err) {
      throw this.wrapError(err);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.client.tools.delete({ id });
    } catch (err) {
      throw this.wrapError(err, 'Tool', id);
    }
  }

  private wrapError(err: unknown, resource?: string, id?: string): Error {
    const status = (err as { statusCode?: number }).statusCode ?? (err as { status?: number }).status;
    if (status === 401) return new AuthenticationError('vapi');
    if (status === 404 && resource && id) return new NotFoundError('vapi', resource, id);
    return new ProviderError('vapi', (err as Error).message ?? String(err), err);
  }
}
