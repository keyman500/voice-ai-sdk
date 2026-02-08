import type { VapiClient } from '@vapi-ai/server-sdk';
import type { FileManager } from '../../core/provider.js';
import type {
  VoiceFile,
  CreateFileParams,
  UpdateFileParams,
  ListFilesParams,
  PaginatedList,
} from '../../core/types.js';
import { ProviderError, NotFoundError, AuthenticationError } from '../../core/errors.js';
import { mapVapiFileToFile } from './vapi-mappers.js';

export class VapiFileManager implements FileManager {
  constructor(private readonly client: VapiClient) {}

  async create(params: CreateFileParams): Promise<VoiceFile> {
    try {
      const dto: Record<string, unknown> = { file: params.file };
      if (params.name) dto.name = params.name;
      if (params.providerOptions) Object.assign(dto, params.providerOptions);
      const result = await this.client.files.create(dto as never);
      return mapVapiFileToFile(result as unknown as Record<string, unknown>);
    } catch (err) {
      throw this.wrapError(err);
    }
  }

  async list(_params?: ListFilesParams): Promise<PaginatedList<VoiceFile>> {
    try {
      const result = await this.client.files.list();
      const items = (result as unknown as Record<string, unknown>[]).map(mapVapiFileToFile);
      return { items, hasMore: false };
    } catch (err) {
      throw this.wrapError(err);
    }
  }

  async get(id: string): Promise<VoiceFile> {
    try {
      const result = await this.client.files.get({ id });
      return mapVapiFileToFile(result as unknown as Record<string, unknown>);
    } catch (err) {
      throw this.wrapError(err, 'File', id);
    }
  }

  async update(id: string, params: UpdateFileParams): Promise<VoiceFile> {
    try {
      const dto: Record<string, unknown> = { id };
      if (params.name) dto.name = params.name;
      if (params.providerOptions) Object.assign(dto, params.providerOptions);
      const result = await this.client.files.update(dto as never);
      return mapVapiFileToFile(result as unknown as Record<string, unknown>);
    } catch (err) {
      throw this.wrapError(err);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.client.files.delete({ id });
    } catch (err) {
      throw this.wrapError(err, 'File', id);
    }
  }

  private wrapError(err: unknown, resource?: string, id?: string): Error {
    const status = (err as { statusCode?: number }).statusCode ?? (err as { status?: number }).status;
    if (status === 401) return new AuthenticationError('vapi');
    if (status === 404 && resource && id) return new NotFoundError('vapi', resource, id);
    return new ProviderError('vapi', (err as Error).message ?? String(err), err);
  }
}
