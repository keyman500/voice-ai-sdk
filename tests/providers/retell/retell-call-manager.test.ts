jest.mock('retell-sdk');

import Retell from 'retell-sdk';
import { createRetell } from '../../../src/providers/retell';
import { ProviderError, NotFoundError, AuthenticationError } from '../../../src/core/errors';

const MockedRetell = Retell as jest.MockedClass<typeof Retell>;

const sampleCall = {
  call_id: 'call_1',
  agent_id: 'agent_1',
  call_status: 'ended',
  to_number: '+15551234567',
  from_number: '+15559876543',
  start_timestamp: 1700000000000,
  end_timestamp: 1700000300000,
  duration_ms: 300000,
  transcript: 'Hello',
  recording_url: 'https://r.com/a.mp3',
};

let mockCall: Record<string, jest.Mock>;

beforeEach(() => {
  jest.clearAllMocks();
  mockCall = {
    createPhoneCall: jest.fn(),
    list: jest.fn(),
    retrieve: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  MockedRetell.mockImplementation(() => ({
    call: mockCall,
  } as unknown as Retell));
});

describe('RetellCallManager', () => {
  describe('create', () => {
    it('creates a call and returns unified type', async () => {
      mockCall.createPhoneCall.mockResolvedValue(sampleCall);
      const provider = createRetell({ apiKey: 'test-key' });

      const call = await provider.calls.create({
        agentId: 'agent_1',
        toNumber: '+15551234567',
        fromNumber: '+15559876543',
      });

      expect(call.id).toBe('call_1');
      expect(call.provider).toBe('retell');
      expect(call.status).toBe('ended');
      expect(mockCall.createPhoneCall).toHaveBeenCalledWith(
        expect.objectContaining({
          agent_id: 'agent_1',
          to_number: '+15551234567',
          from_number: '+15559876543',
        }),
      );
    });

    it('wraps 401 as AuthenticationError', async () => {
      mockCall.createPhoneCall.mockRejectedValue(
        Object.assign(new Error('unauthorized'), { status: 401 }),
      );
      const provider = createRetell({ apiKey: 'test-key' });

      await expect(
        provider.calls.create({ agentId: 'x', toNumber: '+1' }),
      ).rejects.toThrow(AuthenticationError);
    });
  });

  describe('list', () => {
    it('returns paginated list of calls', async () => {
      mockCall.list.mockResolvedValue([sampleCall]);
      const provider = createRetell({ apiKey: 'test-key' });

      const result = await provider.calls.list({ limit: 5 });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('call_1');
      expect(result.hasMore).toBe(false);
      expect(mockCall.list).toHaveBeenCalledWith({ limit: 5 });
    });
  });

  describe('get', () => {
    it('gets a call by id', async () => {
      mockCall.retrieve.mockResolvedValue(sampleCall);
      const provider = createRetell({ apiKey: 'test-key' });

      const call = await provider.calls.get('call_1');
      expect(call.id).toBe('call_1');
      expect(mockCall.retrieve).toHaveBeenCalledWith('call_1');
    });

    it('throws NotFoundError on 404', async () => {
      mockCall.retrieve.mockRejectedValue(
        Object.assign(new Error('not found'), { status: 404 }),
      );
      const provider = createRetell({ apiKey: 'test-key' });

      await expect(provider.calls.get('call_missing')).rejects.toThrow(NotFoundError);
    });
  });

  describe('update', () => {
    it('updates a call with metadata', async () => {
      mockCall.update.mockResolvedValue(sampleCall);
      const provider = createRetell({ apiKey: 'test-key' });

      const call = await provider.calls.update('call_1', {
        metadata: { key: 'value' },
      });
      expect(call.id).toBe('call_1');
      expect(mockCall.update).toHaveBeenCalledWith('call_1', {
        metadata: { key: 'value' },
      });
    });

    it('passes through providerOptions', async () => {
      mockCall.update.mockResolvedValue(sampleCall);
      const provider = createRetell({ apiKey: 'test-key' });

      await provider.calls.update('call_1', {
        providerOptions: { data_storage_setting: 'basic_attributes_only' },
      });
      expect(mockCall.update).toHaveBeenCalledWith('call_1', {
        data_storage_setting: 'basic_attributes_only',
      });
    });
  });

  describe('delete', () => {
    it('deletes a call', async () => {
      mockCall.delete.mockResolvedValue(undefined);
      const provider = createRetell({ apiKey: 'test-key' });

      await provider.calls.delete('call_1');
      expect(mockCall.delete).toHaveBeenCalledWith('call_1');
    });
  });
});
