jest.mock('@vapi-ai/server-sdk');
jest.mock('retell-sdk');

import { VapiClient } from '@vapi-ai/server-sdk';
import Retell from 'retell-sdk';
import { createVapi } from '../../src/providers/vapi';
import { createRetell } from '../../src/providers/retell';
import type { VoiceProvider } from '../../src/core/provider';

const MockedVapiClient = VapiClient as jest.MockedClass<typeof VapiClient>;
const MockedRetell = Retell as jest.MockedClass<typeof Retell>;

// ── Shared fixtures per provider ──

interface ProviderFixture {
  name: string;
  makeProvider: () => VoiceProvider;
}

const vapiFixture: ProviderFixture = {
  name: 'vapi',
  makeProvider: () => {
    const mockAssistants = {
      create: jest.fn(),
      list: jest.fn(),
      get: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    const mockCalls = {
      create: jest.fn(),
      list: jest.fn(),
      get: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    const mockPhoneNumbers = {
      list: jest.fn(),
      get: jest.fn(),
    };

    const agent = { id: 'asst_1', name: 'Test', createdAt: '2024-01-01T00:00:00Z' };
    const call = { id: 'call_1', assistantId: 'asst_1', status: 'ended' };
    const pn = { id: 'pn_1', number: '+15551234567' };

    mockAssistants.create.mockResolvedValue(agent);
    mockAssistants.list.mockResolvedValue([agent]);
    mockAssistants.get.mockResolvedValue(agent);
    mockAssistants.update.mockResolvedValue(agent);
    mockAssistants.delete.mockResolvedValue(agent);
    mockCalls.create.mockResolvedValue(call);
    mockCalls.list.mockResolvedValue([call]);
    mockCalls.get.mockResolvedValue(call);
    mockCalls.update.mockResolvedValue(call);
    mockCalls.delete.mockResolvedValue(call);
    mockPhoneNumbers.list.mockResolvedValue([pn]);
    mockPhoneNumbers.get.mockResolvedValue(pn);

    MockedVapiClient.mockImplementation(() => ({
      assistants: mockAssistants,
      calls: mockCalls,
      phoneNumbers: mockPhoneNumbers,
    } as unknown as VapiClient));

    return createVapi({ apiKey: 'test-key' });
  },
};

const retellFixture: ProviderFixture = {
  name: 'retell',
  makeProvider: () => {
    const mockAgent = {
      create: jest.fn(),
      list: jest.fn(),
      retrieve: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    const mockCall = {
      createPhoneCall: jest.fn(),
      list: jest.fn(),
      retrieve: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    const mockPhoneNumber = {
      list: jest.fn(),
      retrieve: jest.fn(),
    };

    const agent = {
      agent_id: 'agent_1',
      agent_name: 'Test',
      voice_id: 'emma',
      response_engine: { type: 'retell-llm', llm_id: 'llm_1' },
    };
    const call = {
      call_id: 'call_1',
      agent_id: 'agent_1',
      call_status: 'ended',
    };
    const pn = {
      phone_number: '+15551234567',
      nickname: 'Main',
    };

    mockAgent.create.mockResolvedValue(agent);
    mockAgent.list.mockResolvedValue([agent]);
    mockAgent.retrieve.mockResolvedValue(agent);
    mockAgent.update.mockResolvedValue(agent);
    mockAgent.delete.mockResolvedValue(undefined);
    mockCall.createPhoneCall.mockResolvedValue(call);
    mockCall.list.mockResolvedValue([call]);
    mockCall.retrieve.mockResolvedValue(call);
    mockCall.update.mockResolvedValue(call);
    mockCall.delete.mockResolvedValue(undefined);
    mockPhoneNumber.list.mockResolvedValue([pn]);
    mockPhoneNumber.retrieve.mockResolvedValue(pn);

    MockedRetell.mockImplementation(() => ({
      agent: mockAgent,
      call: mockCall,
      phoneNumber: mockPhoneNumber,
    } as unknown as Retell));

    return createRetell({ apiKey: 'test-key' });
  },
};

// ── Conformance Suite ──

describe.each([vapiFixture, retellFixture])(
  'Provider Conformance: $name',
  ({ makeProvider }) => {
    let provider: VoiceProvider;

    beforeEach(() => {
      jest.clearAllMocks();
      provider = makeProvider();
    });

    describe('agents', () => {
      it('create returns Agent with required fields', async () => {
        const agent = await provider.agents.create({ name: 'Test' });
        expect(agent).toHaveProperty('id');
        expect(agent).toHaveProperty('provider');
        expect(agent).toHaveProperty('raw');
        expect(typeof agent.id).toBe('string');
      });

      it('list returns PaginatedList<Agent>', async () => {
        const result = await provider.agents.list();
        expect(result).toHaveProperty('items');
        expect(result).toHaveProperty('hasMore');
        expect(Array.isArray(result.items)).toBe(true);
        expect(typeof result.hasMore).toBe('boolean');
        if (result.items.length > 0) {
          expect(result.items[0]).toHaveProperty('id');
          expect(result.items[0]).toHaveProperty('provider');
        }
      });

      it('get returns a single Agent', async () => {
        const agent = await provider.agents.get('any-id');
        expect(agent).toHaveProperty('id');
        expect(agent).toHaveProperty('provider');
      });

      it('update returns an Agent', async () => {
        const agent = await provider.agents.update('any-id', { name: 'Updated' });
        expect(agent).toHaveProperty('id');
        expect(agent).toHaveProperty('provider');
      });

      it('delete returns void', async () => {
        const result = await provider.agents.delete('any-id');
        expect(result).toBeUndefined();
      });
    });

    describe('calls', () => {
      it('create returns Call with required fields', async () => {
        const call = await provider.calls.create({
          agentId: 'agent-1',
          toNumber: '+15551234567',
        });
        expect(call).toHaveProperty('id');
        expect(call).toHaveProperty('provider');
        expect(call).toHaveProperty('status');
        expect(call).toHaveProperty('raw');
      });

      it('list returns PaginatedList<Call>', async () => {
        const result = await provider.calls.list();
        expect(result).toHaveProperty('items');
        expect(result).toHaveProperty('hasMore');
        expect(Array.isArray(result.items)).toBe(true);
      });

      it('get returns a single Call', async () => {
        const call = await provider.calls.get('any-id');
        expect(call).toHaveProperty('id');
        expect(call).toHaveProperty('status');
      });

      it('update returns a Call', async () => {
        const call = await provider.calls.update('any-id', {});
        expect(call).toHaveProperty('id');
        expect(call).toHaveProperty('status');
      });

      it('delete returns void', async () => {
        const result = await provider.calls.delete('any-id');
        expect(result).toBeUndefined();
      });
    });

    describe('phoneNumbers', () => {
      it('list returns PaginatedList<PhoneNumber>', async () => {
        const result = await provider.phoneNumbers.list();
        expect(result).toHaveProperty('items');
        expect(result).toHaveProperty('hasMore');
        expect(Array.isArray(result.items)).toBe(true);
        if (result.items.length > 0) {
          expect(result.items[0]).toHaveProperty('id');
          expect(result.items[0]).toHaveProperty('provider');
        }
      });

      it('get returns a single PhoneNumber', async () => {
        const pn = await provider.phoneNumbers.get('any-id');
        expect(pn).toHaveProperty('id');
        expect(pn).toHaveProperty('provider');
      });
    });
  },
);

// ── Optional Manager Conformance ──

describe('Vapi optional managers', () => {
  let provider: VoiceProvider;

  beforeEach(() => {
    jest.clearAllMocks();

    const mockTools = {
      create: jest.fn().mockResolvedValue({ id: 'tool_1', type: 'function' }),
      list: jest.fn().mockResolvedValue([{ id: 'tool_1', type: 'function' }]),
      get: jest.fn().mockResolvedValue({ id: 'tool_1', type: 'function' }),
      update: jest.fn().mockResolvedValue({ id: 'tool_1', type: 'function' }),
      delete: jest.fn().mockResolvedValue({ id: 'tool_1' }),
    };
    const mockFiles = {
      create: jest.fn().mockResolvedValue({ id: 'file_1', status: 'done' }),
      list: jest.fn().mockResolvedValue([{ id: 'file_1', status: 'done' }]),
      get: jest.fn().mockResolvedValue({ id: 'file_1', status: 'done' }),
      update: jest.fn().mockResolvedValue({ id: 'file_1', status: 'done' }),
      delete: jest.fn().mockResolvedValue({ id: 'file_1' }),
    };

    MockedVapiClient.mockImplementation(() => ({
      assistants: { create: jest.fn(), list: jest.fn(), get: jest.fn(), update: jest.fn(), delete: jest.fn() },
      calls: { create: jest.fn(), list: jest.fn(), get: jest.fn(), update: jest.fn(), delete: jest.fn() },
      phoneNumbers: { list: jest.fn(), get: jest.fn() },
      tools: mockTools,
      files: mockFiles,
    } as unknown as VapiClient));

    provider = createVapi({ apiKey: 'test-key' });
  });

  it('exposes tools manager', () => {
    expect(provider.tools).toBeDefined();
  });

  it('tools.list returns PaginatedList<Tool>', async () => {
    const result = await provider.tools!.list();
    expect(result).toHaveProperty('items');
    expect(result).toHaveProperty('hasMore');
    expect(result.items[0]).toHaveProperty('id');
    expect(result.items[0]).toHaveProperty('type');
  });

  it('exposes files manager', () => {
    expect(provider.files).toBeDefined();
  });

  it('files.list returns PaginatedList<VoiceFile>', async () => {
    const result = await provider.files!.list();
    expect(result).toHaveProperty('items');
    expect(result.items[0]).toHaveProperty('id');
    expect(result.items[0]).toHaveProperty('status');
  });

  it('does not expose knowledgeBase', () => {
    expect(provider.knowledgeBase).toBeUndefined();
  });
});

describe('Retell optional managers', () => {
  let provider: VoiceProvider;

  beforeEach(() => {
    jest.clearAllMocks();

    const mockKb = {
      create: jest.fn().mockResolvedValue({
        knowledge_base_id: 'kb_1',
        knowledge_base_name: 'FAQ',
        status: 'complete',
      }),
      list: jest.fn().mockResolvedValue([{
        knowledge_base_id: 'kb_1',
        knowledge_base_name: 'FAQ',
        status: 'complete',
      }]),
      retrieve: jest.fn().mockResolvedValue({
        knowledge_base_id: 'kb_1',
        knowledge_base_name: 'FAQ',
        status: 'complete',
      }),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    MockedRetell.mockImplementation(() => ({
      agent: { create: jest.fn(), list: jest.fn(), retrieve: jest.fn(), update: jest.fn(), delete: jest.fn() },
      call: { createPhoneCall: jest.fn(), list: jest.fn(), retrieve: jest.fn(), update: jest.fn(), delete: jest.fn() },
      phoneNumber: { list: jest.fn(), retrieve: jest.fn() },
      knowledgeBase: mockKb,
    } as unknown as Retell));

    provider = createRetell({ apiKey: 'test-key' });
  });

  it('exposes knowledgeBase manager', () => {
    expect(provider.knowledgeBase).toBeDefined();
  });

  it('knowledgeBase.list returns PaginatedList<KnowledgeBase>', async () => {
    const result = await provider.knowledgeBase!.list();
    expect(result).toHaveProperty('items');
    expect(result).toHaveProperty('hasMore');
    expect(result.items[0]).toHaveProperty('id');
    expect(result.items[0]).toHaveProperty('name');
    expect(result.items[0]).toHaveProperty('status');
  });

  it('does not expose tools or files', () => {
    expect(provider.tools).toBeUndefined();
    expect(provider.files).toBeUndefined();
  });
});
