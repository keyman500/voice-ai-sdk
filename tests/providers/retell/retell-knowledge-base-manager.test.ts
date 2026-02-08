jest.mock('retell-sdk');

import Retell from 'retell-sdk';
import { createRetell } from '../../../src/providers/retell';
import { ProviderError, NotFoundError, AuthenticationError } from '../../../src/core/errors';

const MockedRetell = Retell as jest.MockedClass<typeof Retell>;

const sampleKnowledgeBase = {
  knowledge_base_id: 'kb_1',
  knowledge_base_name: 'Product FAQ',
  status: 'complete',
  knowledge_base_sources: [
    {
      source_id: 'src_1',
      type: 'url',
      url: 'https://example.com/faq',
    },
    {
      source_id: 'src_2',
      type: 'document',
      file_url: 'https://storage.example.com/doc.pdf',
      filename: 'doc.pdf',
    },
    {
      source_id: 'src_3',
      type: 'text',
      content_url: 'https://storage.example.com/text.txt',
      title: 'Product Info',
    },
  ],
};

let mockKnowledgeBase: Record<string, jest.Mock>;

beforeEach(() => {
  jest.clearAllMocks();
  mockKnowledgeBase = {
    create: jest.fn(),
    list: jest.fn(),
    retrieve: jest.fn(),
    delete: jest.fn(),
  };
  MockedRetell.mockImplementation(() => ({
    knowledgeBase: mockKnowledgeBase,
  } as unknown as Retell));
});

describe('RetellKnowledgeBaseManager', () => {
  describe('create', () => {
    it('creates a knowledge base and returns unified type', async () => {
      mockKnowledgeBase.create.mockResolvedValue(sampleKnowledgeBase);
      const provider = createRetell({ apiKey: 'test-key' });

      const kb = await provider.knowledgeBase!.create({
        name: 'Product FAQ',
      });

      expect(kb.id).toBe('kb_1');
      expect(kb.provider).toBe('retell');
      expect(kb.name).toBe('Product FAQ');
      expect(kb.status).toBe('complete');
      expect(kb.sources).toHaveLength(3);
      expect(mockKnowledgeBase.create).toHaveBeenCalledWith(
        expect.objectContaining({ knowledge_base_name: 'Product FAQ' }),
      );
    });

    it('wraps errors as ProviderError', async () => {
      mockKnowledgeBase.create.mockRejectedValue(new Error('network error'));
      const provider = createRetell({ apiKey: 'test-key' });

      await expect(
        provider.knowledgeBase!.create({ name: 'Test' }),
      ).rejects.toThrow(ProviderError);
    });

    it('wraps 401 as AuthenticationError', async () => {
      mockKnowledgeBase.create.mockRejectedValue(
        Object.assign(new Error('unauthorized'), { status: 401 }),
      );
      const provider = createRetell({ apiKey: 'test-key' });

      await expect(
        provider.knowledgeBase!.create({ name: 'Test' }),
      ).rejects.toThrow(AuthenticationError);
    });
  });

  describe('list', () => {
    it('returns paginated list of knowledge bases', async () => {
      mockKnowledgeBase.list.mockResolvedValue([sampleKnowledgeBase]);
      const provider = createRetell({ apiKey: 'test-key' });

      const result = await provider.knowledgeBase!.list();
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('kb_1');
      expect(result.items[0].name).toBe('Product FAQ');
      expect(result.hasMore).toBe(false);
    });
  });

  describe('get', () => {
    it('gets a knowledge base by id', async () => {
      mockKnowledgeBase.retrieve.mockResolvedValue(sampleKnowledgeBase);
      const provider = createRetell({ apiKey: 'test-key' });

      const kb = await provider.knowledgeBase!.get('kb_1');
      expect(kb.id).toBe('kb_1');
      expect(kb.name).toBe('Product FAQ');
      expect(kb.sources[0].id).toBe('src_1');
      expect(kb.sources[0].type).toBe('url');
      expect(kb.sources[0].url).toBe('https://example.com/faq');
      expect(kb.sources[1].url).toBe('https://storage.example.com/doc.pdf');
      expect(kb.sources[2].url).toBe('https://storage.example.com/text.txt');
      expect(mockKnowledgeBase.retrieve).toHaveBeenCalledWith('kb_1');
    });

    it('throws NotFoundError on 404', async () => {
      mockKnowledgeBase.retrieve.mockRejectedValue(
        Object.assign(new Error('not found'), { status: 404 }),
      );
      const provider = createRetell({ apiKey: 'test-key' });

      await expect(provider.knowledgeBase!.get('kb_missing')).rejects.toThrow(NotFoundError);
    });
  });

  describe('delete', () => {
    it('deletes a knowledge base', async () => {
      mockKnowledgeBase.delete.mockResolvedValue(undefined);
      const provider = createRetell({ apiKey: 'test-key' });

      await provider.knowledgeBase!.delete('kb_1');
      expect(mockKnowledgeBase.delete).toHaveBeenCalledWith('kb_1');
    });

    it('throws NotFoundError on 404', async () => {
      mockKnowledgeBase.delete.mockRejectedValue(
        Object.assign(new Error('not found'), { status: 404 }),
      );
      const provider = createRetell({ apiKey: 'test-key' });

      await expect(provider.knowledgeBase!.delete('kb_missing')).rejects.toThrow(NotFoundError);
    });
  });
});
