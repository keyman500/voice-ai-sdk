jest.mock('retell-sdk');

import Retell from 'retell-sdk';
import { createRetell } from '../../../src/providers/retell';
import { ProviderError, NotFoundError, AuthenticationError } from '../../../src/core/errors';

const MockedRetell = Retell as jest.MockedClass<typeof Retell>;

const sampleAgent = {
  agent_id: 'agent_1',
  agent_name: 'Test',
  voice_id: 'emma',
  response_engine: { type: 'retell-llm', llm_id: 'llm_1' },
  begin_message: 'Hello',
  last_modification_timestamp: 1700000000000,
};

let mockAgent: Record<string, jest.Mock>;

beforeEach(() => {
  jest.clearAllMocks();
  mockAgent = {
    create: jest.fn(),
    list: jest.fn(),
    retrieve: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  MockedRetell.mockImplementation(() => ({
    agent: mockAgent,
  } as unknown as Retell));
});

describe('RetellAgentManager', () => {
  describe('create', () => {
    it('creates an agent and returns unified type', async () => {
      mockAgent.create.mockResolvedValue(sampleAgent);
      const provider = createRetell({ apiKey: 'test-key' });

      const agent = await provider.agents.create({
        name: 'Test',
        voice: { voiceId: 'emma' },
      });

      expect(agent.id).toBe('agent_1');
      expect(agent.provider).toBe('retell');
      expect(agent.name).toBe('Test');
      expect(mockAgent.create).toHaveBeenCalledWith(
        expect.objectContaining({ agent_name: 'Test', voice_id: 'emma' }),
      );
    });

    it('wraps errors as ProviderError', async () => {
      mockAgent.create.mockRejectedValue(new Error('network error'));
      const provider = createRetell({ apiKey: 'test-key' });

      await expect(provider.agents.create({ name: 'x' })).rejects.toThrow(ProviderError);
    });

    it('wraps 401 as AuthenticationError', async () => {
      mockAgent.create.mockRejectedValue(
        Object.assign(new Error('unauthorized'), { status: 401 }),
      );
      const provider = createRetell({ apiKey: 'test-key' });

      await expect(provider.agents.create({ name: 'x' })).rejects.toThrow(AuthenticationError);
    });
  });

  describe('list', () => {
    it('returns paginated list of agents', async () => {
      mockAgent.list.mockResolvedValue([sampleAgent, { ...sampleAgent, agent_id: 'agent_2' }]);
      const provider = createRetell({ apiKey: 'test-key' });

      const result = await provider.agents.list({ limit: 1 });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('agent_1');
      expect(result.hasMore).toBe(false);
    });

    it('returns all agents when no limit', async () => {
      mockAgent.list.mockResolvedValue([sampleAgent]);
      const provider = createRetell({ apiKey: 'test-key' });

      const result = await provider.agents.list();
      expect(result.items).toHaveLength(1);
    });
  });

  describe('get', () => {
    it('gets an agent by id', async () => {
      mockAgent.retrieve.mockResolvedValue(sampleAgent);
      const provider = createRetell({ apiKey: 'test-key' });

      const agent = await provider.agents.get('agent_1');
      expect(agent.id).toBe('agent_1');
      expect(mockAgent.retrieve).toHaveBeenCalledWith('agent_1');
    });

    it('throws NotFoundError on 404', async () => {
      mockAgent.retrieve.mockRejectedValue(
        Object.assign(new Error('not found'), { status: 404 }),
      );
      const provider = createRetell({ apiKey: 'test-key' });

      await expect(provider.agents.get('agent_missing')).rejects.toThrow(NotFoundError);
    });
  });

  describe('update', () => {
    it('updates and returns unified agent', async () => {
      const updated = { ...sampleAgent, agent_name: 'Updated' };
      mockAgent.update.mockResolvedValue(updated);
      const provider = createRetell({ apiKey: 'test-key' });

      const agent = await provider.agents.update('agent_1', { name: 'Updated' });
      expect(agent.name).toBe('Updated');
      expect(mockAgent.update).toHaveBeenCalledWith(
        'agent_1',
        expect.objectContaining({ agent_name: 'Updated' }),
      );
    });
  });

  describe('delete', () => {
    it('deletes an agent', async () => {
      mockAgent.delete.mockResolvedValue(undefined);
      const provider = createRetell({ apiKey: 'test-key' });

      await provider.agents.delete('agent_1');
      expect(mockAgent.delete).toHaveBeenCalledWith('agent_1');
    });

    it('throws NotFoundError on 404', async () => {
      mockAgent.delete.mockRejectedValue(
        Object.assign(new Error('not found'), { status: 404 }),
      );
      const provider = createRetell({ apiKey: 'test-key' });

      await expect(provider.agents.delete('agent_missing')).rejects.toThrow(NotFoundError);
    });
  });
});
