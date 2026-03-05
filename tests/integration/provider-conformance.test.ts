jest.mock('@vapi-ai/server-sdk');
jest.mock('retell-sdk');
jest.mock('livekit-server-sdk');

import { VapiClient } from '@vapi-ai/server-sdk';
import Retell from 'retell-sdk';
import { SipClient, RoomServiceClient, AgentDispatchClient, AccessToken } from 'livekit-server-sdk';
import { createVapi } from '../../src/providers/vapi';
import { createRetell } from '../../src/providers/retell';
import { createLiveKit } from '../../src/providers/livekit';
import type { VoiceProvider } from '../../src/core/provider';
import type { LiveKitProvider } from '../../src/providers/livekit';

const MockedSipClient = SipClient as jest.MockedClass<typeof SipClient>;
const MockedRoomService = RoomServiceClient as jest.MockedClass<typeof RoomServiceClient>;
const MockedAgentDispatch = AgentDispatchClient as jest.MockedClass<typeof AgentDispatchClient>;
const MockedAccessToken = AccessToken as jest.MockedClass<typeof AccessToken>;

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
      create: jest.fn(),
      list: jest.fn(),
      get: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
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
    mockPhoneNumbers.create.mockResolvedValue(pn);
    mockPhoneNumbers.update.mockResolvedValue(pn);
    mockPhoneNumbers.delete.mockResolvedValue(undefined);

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
      create: jest.fn(),
      list: jest.fn(),
      retrieve: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
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
    mockPhoneNumber.create.mockResolvedValue(pn);
    mockPhoneNumber.update.mockResolvedValue(pn);
    mockPhoneNumber.delete.mockResolvedValue(undefined);

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
      it('create returns a PhoneNumber', async () => {
        const pn = await provider.phoneNumbers.create({});
        expect(pn).toHaveProperty('id');
        expect(pn).toHaveProperty('provider');
      });

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

      it('update returns a PhoneNumber', async () => {
        const pn = await provider.phoneNumbers.update('any-id', {});
        expect(pn).toHaveProperty('id');
        expect(pn).toHaveProperty('provider');
      });

      it('delete returns void', async () => {
        const result = await provider.phoneNumbers.delete('any-id');
        expect(result).toBeUndefined();
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

describe('LiveKit conformance', () => {
  let provider: LiveKitProvider;

  const sampleRule = {
    sipDispatchRuleId: 'rule_1',
    name: 'Test',
    metadata: '',
    attributes: {},
    trunkIds: [],
    hidePhoneNumber: false,
    inboundNumbers: [],
    numbers: [],
  };
  const sampleParticipant = {
    participantId: 'p1',
    participantIdentity: 'sip_+1',
    roomName: 'call-room-1',
    sipCallId: 'sip_1',
  };
  const sampleRoom = {
    name: 'call-room-1',
    creationTimeMs: BigInt(1700000000000),
    creationTime: BigInt(0),
  };
  const samplePn = { id: 'pn_1', e164Format: '+14155551234', sipDispatchRuleId: 'rule_1', areaCode: '415' };

  beforeEach(() => {
    jest.clearAllMocks();

    MockedSipClient.mockImplementation(() => ({
      createSipDispatchRule: jest.fn().mockResolvedValue(sampleRule),
      listSipDispatchRule: jest.fn().mockResolvedValue([sampleRule]),
      updateSipDispatchRuleFields: jest.fn().mockResolvedValue(sampleRule),
      deleteSipDispatchRule: jest.fn().mockResolvedValue(sampleRule),
      createSipParticipant: jest.fn().mockResolvedValue(sampleParticipant),
    } as unknown as SipClient));
    MockedRoomService.mockImplementation(() => ({
      listRooms: jest.fn().mockResolvedValue([sampleRoom]),
      deleteRoom: jest.fn().mockResolvedValue(undefined),
    } as unknown as RoomServiceClient));
    MockedAgentDispatch.mockImplementation(() => ({
      createDispatch: jest.fn().mockResolvedValue({}),
    } as unknown as AgentDispatchClient));
    MockedAccessToken.mockImplementation(() => ({
      addSIPGrant: jest.fn(),
      toJwt: jest.fn().mockResolvedValue('mock-jwt'),
    } as unknown as AccessToken));

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ phone_numbers: [samplePn], phone_number: samplePn }),
      text: jest.fn().mockResolvedValue(''),
    });

    provider = createLiveKit({ apiKey: 'key', secret: 'secret', host: 'https://test.livekit.cloud' });
  });

  describe('agents', () => {
    it('create returns Agent with required fields', async () => {
      const agent = await provider.agents.create({ name: 'Test' });
      expect(agent).toHaveProperty('id');
      expect(agent).toHaveProperty('provider');
      expect(agent).toHaveProperty('raw');
      expect(agent.provider).toBe('livekit');
    });

    it('list returns PaginatedList<Agent>', async () => {
      const result = await provider.agents.list();
      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('hasMore');
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('get returns a single Agent', async () => {
      const agent = await provider.agents.get('rule_1');
      expect(agent).toHaveProperty('id');
      expect(agent.provider).toBe('livekit');
    });

    it('update returns an Agent', async () => {
      const agent = await provider.agents.update('rule_1', { name: 'Updated' });
      expect(agent).toHaveProperty('id');
    });

    it('delete returns void', async () => {
      const result = await provider.agents.delete('rule_1');
      expect(result).toBeUndefined();
    });
  });

  describe('calls', () => {
    it('create returns Call with required fields', async () => {
      const call = await provider.calls.create({
        toNumber: '+14155551234',
        providerOptions: { trunkId: 'trunk_1' },
      });
      expect(call).toHaveProperty('id');
      expect(call).toHaveProperty('provider');
      expect(call).toHaveProperty('status');
      expect(call.provider).toBe('livekit');
    });

    it('delete returns void', async () => {
      const result = await provider.calls.delete('call-room-1');
      expect(result).toBeUndefined();
    });

    it('listActive (LiveKit-specific) returns PaginatedList<Call>', async () => {
      const result = await provider.calls.listActive();
      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('hasMore');
      expect(result.items[0].status).toBe('in-progress');
    });
  });

  describe('phoneNumbers', () => {
    it('list returns PaginatedList<PhoneNumber>', async () => {
      const result = await provider.phoneNumbers.list();
      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('hasMore');
      expect(result.items[0].provider).toBe('livekit');
    });

    it('get returns a PhoneNumber', async () => {
      const pn = await provider.phoneNumbers.get('pn_1');
      expect(pn).toHaveProperty('id');
      expect(pn.provider).toBe('livekit');
    });

    it('create returns a PhoneNumber', async () => {
      const pn = await provider.phoneNumbers.create({ areaCode: '415' });
      expect(pn).toHaveProperty('id');
      expect(pn.provider).toBe('livekit');
    });

    it('update returns a PhoneNumber', async () => {
      const pn = await provider.phoneNumbers.update('pn_1', {});
      expect(pn).toHaveProperty('id');
    });

    it('delete returns void', async () => {
      const result = await provider.phoneNumbers.delete('pn_1');
      expect(result).toBeUndefined();
    });
  });

  describe('optional managers', () => {
    it('does not expose tools', () => {
      expect(provider.tools).toBeUndefined();
    });

    it('does not expose files', () => {
      expect(provider.files).toBeUndefined();
    });

    it('does not expose knowledgeBase', () => {
      expect(provider.knowledgeBase).toBeUndefined();
    });
  });
});
