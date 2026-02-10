jest.mock('@vapi-ai/server-sdk');

import { VapiClient } from '@vapi-ai/server-sdk';
import { createVapi } from '../../../src/providers/vapi';
import { ProviderError, NotFoundError, AuthenticationError } from '../../../src/core/errors';

const MockedVapiClient = VapiClient as jest.MockedClass<typeof VapiClient>;

const sampleCall = {
  id: 'call_1',
  assistantId: 'asst_1',
  status: 'ended',
  startedAt: '2024-01-01T00:00:00Z',
  endedAt: '2024-01-01T00:05:00Z',
  customer: { number: '+15551234567' },
  artifact: { transcript: 'Hello', recordingUrl: 'https://r.com/a.mp3' },
};

let mockCalls: Record<string, jest.Mock>;

beforeEach(() => {
  jest.clearAllMocks();
  mockCalls = {
    create: jest.fn(),
    list: jest.fn(),
    get: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  MockedVapiClient.mockImplementation(() => ({
    calls: mockCalls,
  } as unknown as VapiClient));
});

describe('VapiCallManager', () => {
  describe('create', () => {
    it('creates a call and returns unified type', async () => {
      mockCalls.create.mockResolvedValue(sampleCall);
      const provider = createVapi({ apiKey: 'test-key' });

      const call = await provider.calls.create({
        agentId: 'asst_1',
        toNumber: '+15551234567',
      });

      expect(call.id).toBe('call_1');
      expect(call.provider).toBe('vapi');
      expect(call.status).toBe('ended');
      expect(mockCalls.create).toHaveBeenCalledWith(
        expect.objectContaining({
          assistantId: 'asst_1',
          customer: { number: '+15551234567' },
        }),
      );
    });

    it('wraps 401 as AuthenticationError', async () => {
      mockCalls.create.mockRejectedValue(
        Object.assign(new Error('unauthorized'), { statusCode: 401 }),
      );
      const provider = createVapi({ apiKey: 'test-key' });

      await expect(
        provider.calls.create({ agentId: 'x', toNumber: '+1' }),
      ).rejects.toThrow(AuthenticationError);
    });
  });

  describe('list', () => {
    it('returns paginated list of calls', async () => {
      mockCalls.list.mockResolvedValue([sampleCall]);
      const provider = createVapi({ apiKey: 'test-key' });

      const result = await provider.calls.list({ limit: 5 });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('call_1');
      expect(result.hasMore).toBe(false);
    });

    it('maps list filters to vapi query params', async () => {
      mockCalls.list.mockResolvedValue([]);
      const provider = createVapi({ apiKey: 'test-key' });

      await provider.calls.list({
        limit: 10,
        agentId: 'asst_1',
        phoneNumberId: 'phone_1',
        startTime: '2024-01-01T00:00:00Z',
        endTime: '2024-01-02T00:00:00Z',
      });

      expect(mockCalls.list).toHaveBeenCalledWith({
        limit: 10,
        assistantId: 'asst_1',
        phoneNumberId: 'phone_1',
        createdAtGt: '2024-01-01T00:00:00Z',
        createdAtLt: '2024-01-02T00:00:00Z',
      });
    });

    it('throws on unsupported list params', async () => {
      mockCalls.list.mockResolvedValue([]);
      const provider = createVapi({ apiKey: 'test-key' });

      await expect(
        provider.calls.list({ callStatus: 'ended' }),
      ).rejects.toThrow(ProviderError);
    });
  });

  describe('get', () => {
    it('gets a call by id', async () => {
      mockCalls.get.mockResolvedValue(sampleCall);
      const provider = createVapi({ apiKey: 'test-key' });

      const call = await provider.calls.get('call_1');
      expect(call.id).toBe('call_1');
      expect(mockCalls.get).toHaveBeenCalledWith({ id: 'call_1' });
    });

    it('throws NotFoundError on 404', async () => {
      mockCalls.get.mockRejectedValue(
        Object.assign(new Error('not found'), { statusCode: 404 }),
      );
      const provider = createVapi({ apiKey: 'test-key' });

      await expect(provider.calls.get('call_missing')).rejects.toThrow(NotFoundError);
    });
  });

  describe('update', () => {
    it('updates a call', async () => {
      mockCalls.update.mockResolvedValue(sampleCall);
      const provider = createVapi({ apiKey: 'test-key' });

      const call = await provider.calls.update('call_1', {
        providerOptions: { name: 'Updated Call' },
      });
      expect(call.id).toBe('call_1');
      expect(mockCalls.update).toHaveBeenCalledWith({
        id: 'call_1',
        name: 'Updated Call',
      });
    });
  });

  describe('delete', () => {
    it('deletes a call', async () => {
      mockCalls.delete.mockResolvedValue(sampleCall);
      const provider = createVapi({ apiKey: 'test-key' });

      await provider.calls.delete('call_1');
      expect(mockCalls.delete).toHaveBeenCalledWith({ id: 'call_1' });
    });
  });
});
