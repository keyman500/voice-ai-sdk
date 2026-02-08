jest.mock('retell-sdk');

import Retell from 'retell-sdk';
import { createRetell } from '../../../src/providers/retell';
import { NotFoundError, AuthenticationError } from '../../../src/core/errors';

const MockedRetell = Retell as jest.MockedClass<typeof Retell>;

const samplePhoneNumber = {
  phone_number: '+15551234567',
  nickname: 'Main Line',
  inbound_agent_id: 'agent_1',
  phone_number_pretty: '(555) 123-4567',
};

let mockPhoneNumber: Record<string, jest.Mock>;

beforeEach(() => {
  jest.clearAllMocks();
  mockPhoneNumber = {
    list: jest.fn(),
    retrieve: jest.fn(),
  };
  MockedRetell.mockImplementation(() => ({
    phoneNumber: mockPhoneNumber,
  } as unknown as Retell));
});

describe('RetellPhoneNumberManager', () => {
  describe('list', () => {
    it('returns paginated list of phone numbers', async () => {
      mockPhoneNumber.list.mockResolvedValue([samplePhoneNumber]);
      const provider = createRetell({ apiKey: 'test-key' });

      const result = await provider.phoneNumbers.list({ limit: 10 });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('+15551234567');
      expect(result.items[0].number).toBe('+15551234567');
      expect(result.items[0].name).toBe('Main Line');
      expect(result.hasMore).toBe(false);
    });

    it('limits results client-side', async () => {
      mockPhoneNumber.list.mockResolvedValue([
        samplePhoneNumber,
        { ...samplePhoneNumber, phone_number: '+15550000000' },
      ]);
      const provider = createRetell({ apiKey: 'test-key' });

      const result = await provider.phoneNumbers.list({ limit: 1 });
      expect(result.items).toHaveLength(1);
    });

    it('wraps 401 as AuthenticationError', async () => {
      mockPhoneNumber.list.mockRejectedValue(
        Object.assign(new Error('unauthorized'), { status: 401 }),
      );
      const provider = createRetell({ apiKey: 'test-key' });

      await expect(provider.phoneNumbers.list()).rejects.toThrow(AuthenticationError);
    });
  });

  describe('get', () => {
    it('gets a phone number by id', async () => {
      mockPhoneNumber.retrieve.mockResolvedValue(samplePhoneNumber);
      const provider = createRetell({ apiKey: 'test-key' });

      const pn = await provider.phoneNumbers.get('+15551234567');
      expect(pn.id).toBe('+15551234567');
      expect(pn.provider).toBe('retell');
      expect(mockPhoneNumber.retrieve).toHaveBeenCalledWith('+15551234567');
    });

    it('throws NotFoundError on 404', async () => {
      mockPhoneNumber.retrieve.mockRejectedValue(
        Object.assign(new Error('not found'), { status: 404 }),
      );
      const provider = createRetell({ apiKey: 'test-key' });

      await expect(provider.phoneNumbers.get('+10000000000')).rejects.toThrow(NotFoundError);
    });
  });
});
