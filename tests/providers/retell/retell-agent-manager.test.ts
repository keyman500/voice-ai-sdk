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
  last_modification_timestamp: 1700000000000,
};

let mockAgent: Record<string, jest.Mock>;
let mockLlm: {
  retrieve: jest.Mock;
  update: jest.Mock;
  create: jest.Mock;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockAgent = {
    create: jest.fn(),
    list: jest.fn(),
    retrieve: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  mockLlm = {
    retrieve: jest.fn().mockResolvedValue({
      llm_id: 'llm_1',
      begin_message: 'Hello',
    }),
    update: jest.fn().mockResolvedValue({ llm_id: 'llm_1', begin_message: 'Hello' }),
    create: jest.fn(),
  };
  MockedRetell.mockImplementation(() => ({
    agent: mockAgent,
    llm: mockLlm,
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
        maxDurationSeconds: 300,
        backgroundSound: 'coffee-shop',
        voicemailMessage: 'Please leave a message.',
        webhookUrl: 'https://example.com/webhook',
        webhookTimeoutSeconds: 12,
      });

      expect(agent.id).toBe('agent_1');
      expect(agent.provider).toBe('retell');
      expect(agent.name).toBe('Test');
      expect(agent.firstMessage).toBe('Hello');
      expect(mockLlm.retrieve).toHaveBeenCalledWith('llm_1');
      expect(mockAgent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          agent_name: 'Test',
          voice_id: 'emma',
          max_call_duration_ms: 300000,
          ambient_sound: 'coffee-shop',
          webhook_url: 'https://example.com/webhook',
          webhook_timeout_ms: 12000,
          voicemail_option: {
            action: {
              type: 'static_text',
              text: 'Please leave a message.',
            },
          },
        }),
      );
    });

    it('calls llm.update for firstMessage when response engine is retell-llm', async () => {
      mockAgent.create.mockResolvedValue({
        ...sampleAgent,
        response_engine: { type: 'retell-llm', llm_id: 'llm_new' },
      });
      const provider = createRetell({ apiKey: 'test-key' });

      await provider.agents.create({
        name: 'Bot',
        model: { provider: 'retell-llm', model: 'llm_new' },
        firstMessage: 'Welcome aboard',
      });

      expect(mockLlm.update).toHaveBeenCalledWith(
        'llm_new',
        expect.objectContaining({ begin_message: 'Welcome aboard' }),
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
      expect(result.items[0].firstMessage).toBeUndefined();
      expect(result.hasMore).toBe(false);
      expect(mockLlm.retrieve).not.toHaveBeenCalled();
    });

    it('returns all agents when no limit', async () => {
      mockAgent.list.mockResolvedValue([sampleAgent]);
      const provider = createRetell({ apiKey: 'test-key' });

      const result = await provider.agents.list();
      expect(result.items).toHaveLength(1);
    });
  });

  describe('get', () => {
    it('gets an agent by id and hydrates firstMessage from llm.retrieve', async () => {
      mockAgent.retrieve.mockResolvedValue(sampleAgent);
      mockLlm.retrieve.mockResolvedValue({ llm_id: 'llm_1', begin_message: 'Hi from llm' });
      const provider = createRetell({ apiKey: 'test-key' });

      const agent = await provider.agents.get('agent_1');
      expect(agent.id).toBe('agent_1');
      expect(agent.firstMessage).toBe('Hi from llm');
      expect(mockAgent.retrieve).toHaveBeenCalledWith('agent_1');
      expect(mockLlm.retrieve).toHaveBeenCalledWith('llm_1');
    });

    it('does not call llm.retrieve for custom-llm agents', async () => {
      mockAgent.retrieve.mockResolvedValue({
        ...sampleAgent,
        response_engine: {
          type: 'custom-llm',
          llm_websocket_url: 'wss://x',
        },
      });
      const provider = createRetell({ apiKey: 'test-key' });

      const agent = await provider.agents.get('agent_1');
      expect(agent.firstMessage).toBeUndefined();
      expect(mockLlm.retrieve).not.toHaveBeenCalled();
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

      const agent = await provider.agents.update('agent_1', {
        name: 'Updated',
        maxDurationSeconds: 60,
        backgroundSound: 'static-noise',
        voicemailMessage: 'Bye.',
        webhookUrl: 'https://example.com/wh',
        webhookTimeoutSeconds: 9,
      });
      expect(agent.name).toBe('Updated');
      expect(mockAgent.update).toHaveBeenCalledWith(
        'agent_1',
        expect.objectContaining({
          agent_name: 'Updated',
          max_call_duration_ms: 60000,
          ambient_sound: 'static-noise',
          webhook_url: 'https://example.com/wh',
          webhook_timeout_ms: 9000,
          voicemail_option: {
            action: {
              type: 'static_text',
              text: 'Bye.',
            },
          },
        }),
      );
    });

    it('updates firstMessage via llm.update for retell-llm, not agent.begin_message', async () => {
      mockAgent.retrieve.mockResolvedValue(sampleAgent);
      mockAgent.update.mockResolvedValue(sampleAgent);
      mockLlm.retrieve.mockResolvedValue({ begin_message: 'New opening' });
      const provider = createRetell({ apiKey: 'test-key' });

      await provider.agents.update('agent_1', { firstMessage: 'New opening' });

      expect(mockAgent.update).toHaveBeenCalledWith('agent_1', expect.not.objectContaining({
        begin_message: expect.anything(),
      }));
      expect(mockLlm.update).toHaveBeenCalledWith(
        'llm_1',
        expect.objectContaining({ begin_message: 'New opening' }),
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
