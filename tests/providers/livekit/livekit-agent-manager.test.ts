jest.mock('livekit-server-sdk');

import { SipClient } from 'livekit-server-sdk';
import { createLiveKit } from '../../../src/providers/livekit';
import { ProviderError, NotFoundError, AuthenticationError } from '../../../src/core/errors';

const MockedSipClient = SipClient as jest.MockedClass<typeof SipClient>;

const sampleRule = {
  sipDispatchRuleId: 'rule_1',
  name: 'Sales Agent',
  metadata: '',
  attributes: {
    agentVoiceId: 'rachel',
    agentVoiceProvider: '11labs',
    agentFirstMessage: 'Hello!',
  },
  trunkIds: [],
  hidePhoneNumber: false,
  inboundNumbers: [],
  numbers: [],
};

let mockSip: Record<string, jest.Mock>;

beforeEach(() => {
  jest.clearAllMocks();
  mockSip = {
    createSipDispatchRule: jest.fn(),
    listSipDispatchRule: jest.fn(),
    updateSipDispatchRuleFields: jest.fn(),
    deleteSipDispatchRule: jest.fn(),
    createSipParticipant: jest.fn(),
    listSipInboundTrunk: jest.fn(),
    listSipOutboundTrunk: jest.fn(),
    createSipInboundTrunk: jest.fn(),
    createSipOutboundTrunk: jest.fn(),
    deleteSipTrunk: jest.fn(),
  };
  MockedSipClient.mockImplementation(() => mockSip as unknown as SipClient);
});

describe('LiveKitAgentManager', () => {
  describe('create', () => {
    it('creates a dispatch rule and returns unified agent', async () => {
      mockSip.createSipDispatchRule.mockResolvedValue(sampleRule);
      const provider = createLiveKit({ apiKey: 'key', secret: 'secret', host: 'https://test.livekit.cloud' });

      const agent = await provider.agents.create({
        name: 'Sales Agent',
        voice: { voiceId: 'rachel', provider: '11labs' },
        firstMessage: 'Hello!',
        providerOptions: { roomName: 'sales-room' },
      });

      expect(agent.id).toBe('rule_1');
      expect(agent.provider).toBe('livekit');
      expect(agent.name).toBe('Sales Agent');
      expect(agent.voice).toEqual({ voiceId: 'rachel', provider: '11labs' });
      expect(mockSip.createSipDispatchRule).toHaveBeenCalledWith(
        { type: 'direct', roomName: 'sales-room' },
        expect.objectContaining({
          name: 'Sales Agent',
          attributes: expect.objectContaining({
            agentVoiceId: 'rachel',
            agentFirstMessage: 'Hello!',
          }),
        }),
      );
    });

    it('wraps errors as ProviderError', async () => {
      mockSip.createSipDispatchRule.mockRejectedValue(new Error('network'));
      const provider = createLiveKit({ apiKey: 'k', secret: 's', host: 'https://x' });
      await expect(provider.agents.create({ name: 'x' })).rejects.toThrow(ProviderError);
    });

    it('wraps 401 as AuthenticationError', async () => {
      const err = Object.assign(new Error('unauthorized'), { status: 401 });
      mockSip.createSipDispatchRule.mockRejectedValue(err);
      const provider = createLiveKit({ apiKey: 'k', secret: 's', host: 'https://x' });
      await expect(provider.agents.create({ name: 'x' })).rejects.toThrow(AuthenticationError);
    });
  });

  describe('list', () => {
    it('returns paginated list of agents', async () => {
      mockSip.listSipDispatchRule.mockResolvedValue([sampleRule]);
      const provider = createLiveKit({ apiKey: 'k', secret: 's', host: 'https://x' });

      const result = await provider.agents.list();
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('rule_1');
      expect(result.hasMore).toBe(false);
    });

    it('passes limit via page option', async () => {
      mockSip.listSipDispatchRule.mockResolvedValue([]);
      const provider = createLiveKit({ apiKey: 'k', secret: 's', host: 'https://x' });
      await provider.agents.list({ limit: 5 });
      expect(mockSip.listSipDispatchRule).toHaveBeenCalledWith({ page: { limit: 5 } });
    });
  });

  describe('get', () => {
    it('gets an agent by ID via list filter', async () => {
      mockSip.listSipDispatchRule.mockResolvedValue([sampleRule]);
      const provider = createLiveKit({ apiKey: 'k', secret: 's', host: 'https://x' });

      const agent = await provider.agents.get('rule_1');
      expect(agent.id).toBe('rule_1');
      expect(mockSip.listSipDispatchRule).toHaveBeenCalledWith({ dispatchRuleIds: ['rule_1'] });
    });

    it('throws NotFoundError when rule is not in response', async () => {
      mockSip.listSipDispatchRule.mockResolvedValue([]);
      const provider = createLiveKit({ apiKey: 'k', secret: 's', host: 'https://x' });
      await expect(provider.agents.get('rule_missing')).rejects.toThrow(NotFoundError);
    });

    it('throws NotFoundError on 404', async () => {
      const err = Object.assign(new Error('not found'), { status: 404 });
      mockSip.listSipDispatchRule.mockRejectedValue(err);
      const provider = createLiveKit({ apiKey: 'k', secret: 's', host: 'https://x' });
      await expect(provider.agents.get('rule_1')).rejects.toThrow(NotFoundError);
    });
  });

  describe('update', () => {
    it('updates and returns unified agent', async () => {
      const updated = { ...sampleRule, name: 'Updated' };
      mockSip.updateSipDispatchRuleFields.mockResolvedValue(updated);
      const provider = createLiveKit({ apiKey: 'k', secret: 's', host: 'https://x' });

      const agent = await provider.agents.update('rule_1', { name: 'Updated' });
      expect(agent.name).toBe('Updated');
      expect(mockSip.updateSipDispatchRuleFields).toHaveBeenCalledWith(
        'rule_1',
        expect.objectContaining({ name: 'Updated' }),
      );
    });
  });

  describe('delete', () => {
    it('deletes a dispatch rule', async () => {
      mockSip.deleteSipDispatchRule.mockResolvedValue(sampleRule);
      const provider = createLiveKit({ apiKey: 'k', secret: 's', host: 'https://x' });

      await provider.agents.delete('rule_1');
      expect(mockSip.deleteSipDispatchRule).toHaveBeenCalledWith('rule_1');
    });

    it('throws NotFoundError on 404', async () => {
      const err = Object.assign(new Error('not found'), { status: 404 });
      mockSip.deleteSipDispatchRule.mockRejectedValue(err);
      const provider = createLiveKit({ apiKey: 'k', secret: 's', host: 'https://x' });
      await expect(provider.agents.delete('rule_missing')).rejects.toThrow(NotFoundError);
    });
  });
});
