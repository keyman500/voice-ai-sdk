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

let mockLlm: { retrieve: jest.Mock; update: jest.Mock };

beforeEach(() => {
  jest.clearAllMocks();
  mockKnowledgeBase = {
    create: jest.fn(),
    list: jest.fn(),
    retrieve: jest.fn(),
    delete: jest.fn(),
    addSources: jest.fn(),
    deleteSource: jest.fn(),
  };
  mockLlm = {
    retrieve: jest.fn().mockResolvedValue({
      llm_id: 'llm_1',
      knowledge_base_ids: ['kb_existing'],
    }),
    update: jest.fn().mockResolvedValue({}),
  };
  MockedRetell.mockImplementation(() => ({
    knowledgeBase: mockKnowledgeBase,
    llm: mockLlm,
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

    it('truncates knowledge_base_name to 39 characters for Retell API limit', async () => {
      mockKnowledgeBase.create.mockResolvedValue({
        ...sampleKnowledgeBase,
        knowledge_base_name: 'x'.repeat(39),
      });
      const provider = createRetell({ apiKey: 'test-key' });
      const longName = 'R'.repeat(60);

      await provider.knowledgeBase!.create({ name: longName });

      expect(mockKnowledgeBase.create).toHaveBeenCalledWith(
        expect.objectContaining({ knowledge_base_name: 'R'.repeat(39) }),
      );
    });

    it('accepts initial source payload in providerOptions', async () => {
      mockKnowledgeBase.create.mockResolvedValue(sampleKnowledgeBase);
      const provider = createRetell({ apiKey: 'test-key' });

      await provider.knowledgeBase!.create({
        name: 'KB With Source',
        providerOptions: {
          urls: ['https://example.com/start'],
          texts: [{ title: 'Intro', text: 'hello' }],
          files: [Buffer.from('seed')],
        },
      });

      expect(mockKnowledgeBase.create).toHaveBeenCalledWith(
        expect.objectContaining({
          knowledge_base_name: 'KB With Source',
          knowledge_base_urls: ['https://example.com/start'],
          knowledge_base_texts: [{ title: 'Intro', text: 'hello' }],
          knowledge_base_files: [expect.any(Buffer)],
        }),
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

  describe('addSources (Retell-only)', () => {
    it('calls Retell addSources and returns unified KnowledgeBase', async () => {
      mockKnowledgeBase.addSources.mockResolvedValue(sampleKnowledgeBase);
      const provider = createRetell({ apiKey: 'test-key' });
      const kb = await (provider.knowledgeBase as import('../../../src/providers/retell/retell-knowledge-base-manager').RetellKnowledgeBaseManager).addSources(
        'kb_1',
        {
          urls: ['https://example.com/doc'],
          texts: [{ title: 'Note', text: 'Hello' }],
          files: [Buffer.from('x')],
        },
      );
      expect(kb.id).toBe('kb_1');
      expect(mockKnowledgeBase.addSources).toHaveBeenCalledWith(
        'kb_1',
        expect.objectContaining({
          knowledge_base_urls: ['https://example.com/doc'],
          knowledge_base_texts: [{ title: 'Note', text: 'Hello' }],
          knowledge_base_files: [expect.any(Buffer)],
        }),
      );
    });

    it('wraps 401 as AuthenticationError', async () => {
      mockKnowledgeBase.addSources.mockRejectedValue(
        Object.assign(new Error('unauthorized'), { status: 401 }),
      );
      const provider = createRetell({ apiKey: 'test-key' });
      const mgr = provider.knowledgeBase as import('../../../src/providers/retell/retell-knowledge-base-manager').RetellKnowledgeBaseManager;
      await expect(
        mgr.addSources('kb_1', { urls: ['https://a.com'] }),
      ).rejects.toThrow(AuthenticationError);
    });
  });

  describe('deleteSource (Retell-only)', () => {
    it('calls Retell deleteSource and returns unified KnowledgeBase', async () => {
      mockKnowledgeBase.deleteSource.mockResolvedValue(sampleKnowledgeBase);
      const provider = createRetell({ apiKey: 'test-key' });
      const mgr = provider.knowledgeBase as import('../../../src/providers/retell/retell-knowledge-base-manager').RetellKnowledgeBaseManager;
      const kb = await mgr.deleteSource('kb_1', 'src_1');
      expect(kb.sources).toHaveLength(3);
      expect(mockKnowledgeBase.deleteSource).toHaveBeenCalledWith('kb_1', 'src_1');
    });

    it('throws NotFoundError on 404', async () => {
      mockKnowledgeBase.deleteSource.mockRejectedValue(
        Object.assign(new Error('not found'), { status: 404 }),
      );
      const provider = createRetell({ apiKey: 'test-key' });
      const mgr = provider.knowledgeBase as import('../../../src/providers/retell/retell-knowledge-base-manager').RetellKnowledgeBaseManager;
      await expect(mgr.deleteSource('kb_x', 'src_x')).rejects.toThrow(NotFoundError);
    });
  });

  describe('attachToRetellLlm / detachFromRetellLlm (Retell-only)', () => {
    it('merges knowledge_base_ids on attach', async () => {
      const provider = createRetell({ apiKey: 'test-key' });
      const mgr = provider.knowledgeBase as import('../../../src/providers/retell/retell-knowledge-base-manager').RetellKnowledgeBaseManager;
      await mgr.attachToRetellLlm('llm_1', 'kb_new');
      expect(mockLlm.retrieve).toHaveBeenCalledWith('llm_1');
      expect(mockLlm.update).toHaveBeenCalledWith('llm_1', {
        knowledge_base_ids: ['kb_existing', 'kb_new'],
      });
    });

    it('removes id on detach', async () => {
      mockLlm.retrieve.mockResolvedValue({
        llm_id: 'llm_1',
        knowledge_base_ids: ['kb_a', 'kb_b'],
      });
      const provider = createRetell({ apiKey: 'test-key' });
      const mgr = provider.knowledgeBase as import('../../../src/providers/retell/retell-knowledge-base-manager').RetellKnowledgeBaseManager;
      await mgr.detachFromRetellLlm('llm_1', 'kb_a');
      expect(mockLlm.update).toHaveBeenCalledWith('llm_1', {
        knowledge_base_ids: ['kb_b'],
      });
    });
  });
});
