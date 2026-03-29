jest.mock('retell-sdk');

import Retell from 'retell-sdk';
import { createRetell } from '../../../src/providers/retell';
import { ProviderError, AuthenticationError } from '../../../src/core/errors';

const MockedRetell = Retell as jest.MockedClass<typeof Retell>;

const sampleBatchCall = {
  batch_call_id: 'batch_1',
  agent_id: 'agent_1',
  from_number: '+15559876543',
  total_tasks_count: 2,
  created_at: 1700000000000,
  trigger_timestamp: 1700001000000,
  status: 'queued',
};

let mockBatchCall: Record<string, jest.Mock>;

beforeEach(() => {
  jest.clearAllMocks();
  mockBatchCall = {
    createBatchCall: jest.fn(),
  };
  MockedRetell.mockImplementation(
    () =>
      ({
        batchCall: mockBatchCall,
      }) as unknown as Retell,
  );
});

describe('RetellCampaignManager', () => {
  describe('create', () => {
    it('creates a batch call campaign and returns unified type', async () => {
      mockBatchCall.createBatchCall.mockResolvedValue(sampleBatchCall);
      const provider = createRetell({ apiKey: 'test-key' });

      const campaign = await provider.campaigns!.create({
        agentId: 'agent_1',
        fromNumber: '+15559876543',
        tasks: [
          { toNumber: '+15551234567' },
          { toNumber: '+15557654321', metadata: { first_name: 'Ada' } },
        ],
      });

      expect(campaign.id).toBe('batch_1');
      expect(campaign.provider).toBe('retell');
      expect(campaign.agentId).toBe('agent_1');
      expect(campaign.fromNumber).toBe('+15559876543');
      expect(campaign.recipientCount).toBe(2);
      expect(mockBatchCall.createBatchCall).toHaveBeenCalledWith(
        expect.objectContaining({
          from_number: '+15559876543',
          tasks: [
            { to_number: '+15551234567' },
            {
              to_number: '+15557654321',
              metadata: { first_name: 'Ada' },
            },
          ],
        }),
      );
    });

    it('wraps 401 as AuthenticationError', async () => {
      mockBatchCall.createBatchCall.mockRejectedValue(
        Object.assign(new Error('unauthorized'), { status: 401 }),
      );
      const provider = createRetell({ apiKey: 'test-key' });

      await expect(
        provider.campaigns!.create({
          fromNumber: '+15559876543',
          tasks: [{ toNumber: '+15551234567' }],
        }),
      ).rejects.toThrow(AuthenticationError);
    });
  });

  describe('unsupported lifecycle methods', () => {
    it('throws ProviderError for list/get/update/delete because Retell batch calls are create-only in SDK v1', async () => {
      const provider = createRetell({ apiKey: 'test-key' });

      await expect(provider.campaigns!.list()).rejects.toThrow(ProviderError);
      await expect(provider.campaigns!.get('batch_1')).rejects.toThrow(
        ProviderError,
      );
      await expect(
        provider.campaigns!.update('batch_1', { status: 'cancelled' }),
      ).rejects.toThrow(ProviderError);
      await expect(provider.campaigns!.delete('batch_1')).rejects.toThrow(
        ProviderError,
      );
    });
  });
});
