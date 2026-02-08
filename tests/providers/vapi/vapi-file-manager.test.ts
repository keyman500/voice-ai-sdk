jest.mock('@vapi-ai/server-sdk');

import { VapiClient } from '@vapi-ai/server-sdk';
import { createVapi } from '../../../src/providers/vapi';
import { ProviderError, NotFoundError, AuthenticationError } from '../../../src/core/errors';

const MockedVapiClient = VapiClient as jest.MockedClass<typeof VapiClient>;

const sampleFile = {
  id: 'file_1',
  name: 'transcript.txt',
  status: 'done',
  bytes: 1024,
  url: 'https://storage.example.com/file_1',
  mimetype: 'text/plain',
  metadata: { source: 'upload' },
  orgId: 'org_1',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

let mockFiles: Record<string, jest.Mock>;

beforeEach(() => {
  jest.clearAllMocks();
  mockFiles = {
    create: jest.fn(),
    list: jest.fn(),
    get: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  MockedVapiClient.mockImplementation(() => ({
    files: mockFiles,
  } as unknown as VapiClient));
});

describe('VapiFileManager', () => {
  describe('create', () => {
    it('creates a file and returns unified type', async () => {
      mockFiles.create.mockResolvedValue(sampleFile);
      const provider = createVapi({ apiKey: 'test-key' });

      const file = await provider.files!.create({
        file: Buffer.from('test content'),
        name: 'transcript.txt',
      });

      expect(file.id).toBe('file_1');
      expect(file.provider).toBe('vapi');
      expect(file.name).toBe('transcript.txt');
      expect(file.status).toBe('done');
      expect(file.bytes).toBe(1024);
      expect(file.mimeType).toBe('text/plain');
      expect(file.metadata).toEqual({ source: 'upload' });
      expect(mockFiles.create).toHaveBeenCalledWith(
        expect.objectContaining({ file: expect.any(Buffer), name: 'transcript.txt' }),
      );
    });

    it('wraps errors as ProviderError', async () => {
      mockFiles.create.mockRejectedValue(new Error('network error'));
      const provider = createVapi({ apiKey: 'test-key' });

      await expect(
        provider.files!.create({ file: Buffer.from('test') }),
      ).rejects.toThrow(ProviderError);
    });

    it('wraps 401 as AuthenticationError', async () => {
      mockFiles.create.mockRejectedValue(
        Object.assign(new Error('unauthorized'), { statusCode: 401 }),
      );
      const provider = createVapi({ apiKey: 'test-key' });

      await expect(
        provider.files!.create({ file: Buffer.from('test') }),
      ).rejects.toThrow(AuthenticationError);
    });
  });

  describe('list', () => {
    it('returns paginated list of files', async () => {
      mockFiles.list.mockResolvedValue([sampleFile]);
      const provider = createVapi({ apiKey: 'test-key' });

      const result = await provider.files!.list();
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('file_1');
      expect(result.items[0].status).toBe('done');
      expect(result.hasMore).toBe(false);
    });
  });

  describe('get', () => {
    it('gets a file by id', async () => {
      mockFiles.get.mockResolvedValue(sampleFile);
      const provider = createVapi({ apiKey: 'test-key' });

      const file = await provider.files!.get('file_1');
      expect(file.id).toBe('file_1');
      expect(file.url).toBe('https://storage.example.com/file_1');
      expect(mockFiles.get).toHaveBeenCalledWith({ id: 'file_1' });
    });

    it('throws NotFoundError on 404', async () => {
      mockFiles.get.mockRejectedValue(
        Object.assign(new Error('not found'), { statusCode: 404 }),
      );
      const provider = createVapi({ apiKey: 'test-key' });

      await expect(provider.files!.get('file_missing')).rejects.toThrow(NotFoundError);
    });
  });

  describe('update', () => {
    it('updates and returns unified file', async () => {
      const updated = { ...sampleFile, name: 'updated.txt' };
      mockFiles.update.mockResolvedValue(updated);
      const provider = createVapi({ apiKey: 'test-key' });

      const file = await provider.files!.update('file_1', { name: 'updated.txt' });
      expect(file.name).toBe('updated.txt');
      expect(mockFiles.update).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'file_1', name: 'updated.txt' }),
      );
    });
  });

  describe('delete', () => {
    it('deletes a file', async () => {
      mockFiles.delete.mockResolvedValue(sampleFile);
      const provider = createVapi({ apiKey: 'test-key' });

      await provider.files!.delete('file_1');
      expect(mockFiles.delete).toHaveBeenCalledWith({ id: 'file_1' });
    });

    it('throws NotFoundError on 404', async () => {
      mockFiles.delete.mockRejectedValue(
        Object.assign(new Error('not found'), { statusCode: 404 }),
      );
      const provider = createVapi({ apiKey: 'test-key' });

      await expect(provider.files!.delete('file_missing')).rejects.toThrow(NotFoundError);
    });
  });
});
