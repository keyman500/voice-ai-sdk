jest.mock('livekit-server-sdk');

import { SipClient, RoomServiceClient, AgentDispatchClient, AccessToken } from 'livekit-server-sdk';
import { createLiveKit } from '../../../src/providers/livekit';
import { ProviderError, NotFoundError, AuthenticationError } from '../../../src/core/errors';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

const MockedSipClient = SipClient as jest.MockedClass<typeof SipClient>;
const MockedRoomService = RoomServiceClient as jest.MockedClass<typeof RoomServiceClient>;
const MockedAgentDispatch = AgentDispatchClient as jest.MockedClass<typeof AgentDispatchClient>;
const MockedAccessToken = AccessToken as jest.MockedClass<typeof AccessToken>;

const samplePhoneNumber = {
  id: 'pn_1',
  e164Format: '+14155551234',
  sipDispatchRuleId: 'rule_1',
  areaCode: '415',
  status: 'active',
};

function makeMockResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(JSON.stringify(data)),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  MockedSipClient.mockImplementation(() => ({
    createSipDispatchRule: jest.fn(),
    listSipDispatchRule: jest.fn(),
    updateSipDispatchRuleFields: jest.fn(),
    deleteSipDispatchRule: jest.fn(),
    createSipParticipant: jest.fn(),
  } as unknown as SipClient));
  MockedRoomService.mockImplementation(() => ({
    listRooms: jest.fn(),
    deleteRoom: jest.fn(),
  } as unknown as RoomServiceClient));
  MockedAgentDispatch.mockImplementation(() => ({
    createDispatch: jest.fn(),
  } as unknown as AgentDispatchClient));

  // Mock AccessToken to return a predictable JWT
  MockedAccessToken.mockImplementation(() => {
    return {
      addSIPGrant: jest.fn(),
      toJwt: jest.fn().mockResolvedValue('mock-jwt-token'),
    } as unknown as AccessToken;
  });
});

describe('LiveKitPhoneNumberManager', () => {
  describe('list', () => {
    it('lists phone numbers via Twirp API', async () => {
      mockFetch.mockResolvedValue(
        makeMockResponse({ phone_numbers: [samplePhoneNumber] }),
      );
      const provider = createLiveKit({ apiKey: 'key', secret: 'secret', host: 'https://test.livekit.cloud' });

      const result = await provider.phoneNumbers.list();
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('pn_1');
      expect(result.items[0].provider).toBe('livekit');
      expect(result.items[0].number).toBe('+14155551234');
      expect(result.items[0].agentId).toBe('rule_1');
      expect(result.hasMore).toBe(false);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.livekit.cloud/twirp/livekit.PhoneNumberService/ListPhoneNumbers',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer mock-jwt-token' }),
        }),
      );
    });

    it('wraps errors as ProviderError', async () => {
      mockFetch.mockResolvedValue(makeMockResponse({ msg: 'server error' }, 500));
      const provider = createLiveKit({ apiKey: 'k', secret: 's', host: 'https://x' });
      await expect(provider.phoneNumbers.list()).rejects.toThrow(ProviderError);
    });

    it('wraps 401 as AuthenticationError', async () => {
      mockFetch.mockResolvedValue(makeMockResponse({ msg: 'unauthorized' }, 401));
      const provider = createLiveKit({ apiKey: 'k', secret: 's', host: 'https://x' });
      await expect(provider.phoneNumbers.list()).rejects.toThrow(AuthenticationError);
    });
  });

  describe('get', () => {
    it('gets a phone number by ID', async () => {
      mockFetch.mockResolvedValue(makeMockResponse({ phone_number: samplePhoneNumber }));
      const provider = createLiveKit({ apiKey: 'k', secret: 's', host: 'https://x' });

      const pn = await provider.phoneNumbers.get('pn_1');
      expect(pn.id).toBe('pn_1');
      expect(pn.number).toBe('+14155551234');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('GetPhoneNumber'),
        expect.objectContaining({ body: JSON.stringify({ id: 'pn_1' }) }),
      );
    });

    it('throws NotFoundError on 404', async () => {
      mockFetch.mockResolvedValue(makeMockResponse({}, 404));
      const provider = createLiveKit({ apiKey: 'k', secret: 's', host: 'https://x' });
      await expect(provider.phoneNumbers.get('pn_missing')).rejects.toThrow(NotFoundError);
    });
  });

  describe('create', () => {
    it('purchases a phone number', async () => {
      mockFetch.mockResolvedValue(makeMockResponse({ phone_number: samplePhoneNumber }));
      const provider = createLiveKit({ apiKey: 'k', secret: 's', host: 'https://x' });

      const pn = await provider.phoneNumbers.create({
        areaCode: '415',
        inboundAgentId: 'rule_1',
      });

      expect(pn.id).toBe('pn_1');
      expect(pn.inboundAgentId).toBe('rule_1');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('PurchasePhoneNumber'),
        expect.objectContaining({
          body: JSON.stringify({ area_code: '415', sip_dispatch_rule_id: 'rule_1' }),
        }),
      );
    });
  });

  describe('update', () => {
    it('updates the dispatch rule assigned to a phone number', async () => {
      const updated = { ...samplePhoneNumber, sipDispatchRuleId: 'rule_2' };
      mockFetch.mockResolvedValue(makeMockResponse({ phone_number: updated }));
      const provider = createLiveKit({ apiKey: 'k', secret: 's', host: 'https://x' });

      const pn = await provider.phoneNumbers.update('pn_1', { inboundAgentId: 'rule_2' });
      expect(pn.agentId).toBe('rule_2');
      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toContain('UpdatePhoneNumber');
      const body = JSON.parse(opts.body);
      expect(body.id).toBe('pn_1');
      expect(body.sip_dispatch_rule_id).toBe('rule_2');
    });
  });

  describe('delete', () => {
    it('releases a phone number', async () => {
      mockFetch.mockResolvedValue(makeMockResponse({}));
      const provider = createLiveKit({ apiKey: 'k', secret: 's', host: 'https://x' });

      await provider.phoneNumbers.delete('pn_1');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('ReleasePhoneNumbers'),
        expect.objectContaining({
          body: JSON.stringify({ ids: ['pn_1'] }),
        }),
      );
    });

    it('throws NotFoundError on 404', async () => {
      mockFetch.mockResolvedValue(makeMockResponse({}, 404));
      const provider = createLiveKit({ apiKey: 'k', secret: 's', host: 'https://x' });
      await expect(provider.phoneNumbers.delete('pn_missing')).rejects.toThrow(NotFoundError);
    });
  });
});
