jest.mock('@vapi-ai/server-sdk');

import { VapiClient } from '@vapi-ai/server-sdk';
import { createVapi } from '../../../src/providers/vapi';
import { ProviderError, NotFoundError, AuthenticationError } from '../../../src/core/errors';

const MockedVapiClient = VapiClient as jest.MockedClass<typeof VapiClient>;

const sampleAssistant = {
  id: 'asst_1',
  name: 'Test',
  voice: { voiceId: 'rachel', provider: '11labs' },
  model: { provider: 'openai', model: 'gpt-4' },
  firstMessage: 'Hello',
  orgId: 'org_1',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

let mockAssistants: Record<string, jest.Mock>;

beforeEach(() => {
  jest.clearAllMocks();
  mockAssistants = {
    create: jest.fn(),
    list: jest.fn(),
    get: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  MockedVapiClient.mockImplementation(() => ({
    assistants: mockAssistants,
  } as unknown as VapiClient));
});

describe('VapiAgentManager', () => {
  describe('create', () => {
    it('creates an agent and returns unified type', async () => {
      mockAssistants.create.mockResolvedValue(sampleAssistant);
      const provider = createVapi({ apiKey: 'test-key' });

      const agent = await provider.agents.create({
        name: 'Test',
        voice: { voiceId: 'rachel', provider: '11labs' },
        model: { provider: 'openai', model: 'gpt-4' },
      });

      expect(agent.id).toBe('asst_1');
      expect(agent.provider).toBe('vapi');
      expect(agent.name).toBe('Test');
      expect(mockAssistants.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Test' }),
      );
    });

    it('wraps errors as ProviderError', async () => {
      mockAssistants.create.mockRejectedValue(new Error('network error'));
      const provider = createVapi({ apiKey: 'test-key' });

      await expect(provider.agents.create({ name: 'x' })).rejects.toThrow(ProviderError);
    });

    it('wraps 401 as AuthenticationError', async () => {
      mockAssistants.create.mockRejectedValue(
        Object.assign(new Error('unauthorized'), { statusCode: 401 }),
      );
      const provider = createVapi({ apiKey: 'test-key' });

      await expect(provider.agents.create({ name: 'x' })).rejects.toThrow(AuthenticationError);
    });
  });

  describe('list', () => {
    it('returns paginated list of agents', async () => {
      mockAssistants.list.mockResolvedValue([sampleAssistant]);
      const provider = createVapi({ apiKey: 'test-key' });

      const result = await provider.agents.list({ limit: 10 });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('asst_1');
      expect(result.hasMore).toBe(false);
      expect(mockAssistants.list).toHaveBeenCalledWith({ limit: 10 });
    });

    it('handles no params', async () => {
      mockAssistants.list.mockResolvedValue([]);
      const provider = createVapi({ apiKey: 'test-key' });

      const result = await provider.agents.list();
      expect(result.items).toEqual([]);
      expect(mockAssistants.list).toHaveBeenCalledWith({});
    });
  });

  describe('get', () => {
    it('gets an agent by id', async () => {
      mockAssistants.get.mockResolvedValue(sampleAssistant);
      const provider = createVapi({ apiKey: 'test-key' });

      const agent = await provider.agents.get('asst_1');
      expect(agent.id).toBe('asst_1');
      expect(mockAssistants.get).toHaveBeenCalledWith({ id: 'asst_1' });
    });

    it('throws NotFoundError on 404', async () => {
      mockAssistants.get.mockRejectedValue(
        Object.assign(new Error('not found'), { statusCode: 404 }),
      );
      const provider = createVapi({ apiKey: 'test-key' });

      await expect(provider.agents.get('asst_missing')).rejects.toThrow(NotFoundError);
    });
  });

  describe('update', () => {
    it('updates and returns unified agent', async () => {
      const updated = { ...sampleAssistant, name: 'Updated' };
      mockAssistants.update.mockResolvedValue(updated);
      const provider = createVapi({ apiKey: 'test-key' });

      const agent = await provider.agents.update('asst_1', { name: 'Updated' });
      expect(agent.name).toBe('Updated');
      expect(mockAssistants.update).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'asst_1', name: 'Updated' }),
      );
    });
  });

  describe('delete', () => {
    it('deletes an agent', async () => {
      mockAssistants.delete.mockResolvedValue(sampleAssistant);
      const provider = createVapi({ apiKey: 'test-key' });

      await provider.agents.delete('asst_1');
      expect(mockAssistants.delete).toHaveBeenCalledWith({ id: 'asst_1' });
    });

    it('throws NotFoundError on 404', async () => {
      mockAssistants.delete.mockRejectedValue(
        Object.assign(new Error('not found'), { statusCode: 404 }),
      );
      const provider = createVapi({ apiKey: 'test-key' });

      await expect(provider.agents.delete('asst_missing')).rejects.toThrow(NotFoundError);
    });
  });
});
