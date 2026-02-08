jest.mock('@vapi-ai/server-sdk');

import { VapiClient } from '@vapi-ai/server-sdk';
import { createVapi } from '../../../src/providers/vapi';
import { NotFoundError, AuthenticationError } from '../../../src/core/errors';

const MockedVapiClient = VapiClient as jest.MockedClass<typeof VapiClient>;

const samplePhoneNumber = {
  id: 'pn_1',
  number: '+15551234567',
  name: 'Main Line',
  assistantId: 'asst_1',
  provider: 'vapi',
};

let mockPhoneNumbers: Record<string, jest.Mock>;

beforeEach(() => {
  jest.clearAllMocks();
  mockPhoneNumbers = {
    list: jest.fn(),
    get: jest.fn(),
  };
  MockedVapiClient.mockImplementation(() => ({
    phoneNumbers: mockPhoneNumbers,
  } as unknown as VapiClient));
});

describe('VapiPhoneNumberManager', () => {
  describe('list', () => {
    it('returns paginated list of phone numbers', async () => {
      mockPhoneNumbers.list.mockResolvedValue([samplePhoneNumber]);
      const provider = createVapi({ apiKey: 'test-key' });

      const result = await provider.phoneNumbers.list({ limit: 10 });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('pn_1');
      expect(result.items[0].number).toBe('+15551234567');
      expect(result.hasMore).toBe(false);
    });

    it('wraps 401 as AuthenticationError', async () => {
      mockPhoneNumbers.list.mockRejectedValue(
        Object.assign(new Error('unauthorized'), { statusCode: 401 }),
      );
      const provider = createVapi({ apiKey: 'test-key' });

      await expect(provider.phoneNumbers.list()).rejects.toThrow(AuthenticationError);
    });
  });

  describe('get', () => {
    it('gets a phone number by id', async () => {
      mockPhoneNumbers.get.mockResolvedValue(samplePhoneNumber);
      const provider = createVapi({ apiKey: 'test-key' });

      const pn = await provider.phoneNumbers.get('pn_1');
      expect(pn.id).toBe('pn_1');
      expect(pn.provider).toBe('vapi');
      expect(mockPhoneNumbers.get).toHaveBeenCalledWith({ id: 'pn_1' });
    });

    it('throws NotFoundError on 404', async () => {
      mockPhoneNumbers.get.mockRejectedValue(
        Object.assign(new Error('not found'), { statusCode: 404 }),
      );
      const provider = createVapi({ apiKey: 'test-key' });

      await expect(provider.phoneNumbers.get('pn_missing')).rejects.toThrow(NotFoundError);
    });
  });
});
