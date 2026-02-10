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
    create: jest.fn(),
    list: jest.fn(),
    retrieve: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  MockedRetell.mockImplementation(() => ({
    phoneNumber: mockPhoneNumber,
  } as unknown as Retell));
});

describe('RetellPhoneNumberManager', () => {
  describe('create', () => {
    it('creates a phone number', async () => {
      mockPhoneNumber.create.mockResolvedValue(samplePhoneNumber);
      const provider = createRetell({ apiKey: 'test-key' });

      const pn = await provider.phoneNumbers.create({
        name: 'Main Line',
        inboundAgentId: 'agent_1',
        outboundAgentId: 'agent_2',
        webhookUrl: 'https://example.com/webhook',
        areaCode: '415',
      });

      expect(pn.id).toBe('+15551234567');
      expect(mockPhoneNumber.create).toHaveBeenCalledWith(
        expect.objectContaining({
          nickname: 'Main Line',
          inbound_agent_id: 'agent_1',
          outbound_agent_id: 'agent_2',
          inbound_webhook_url: 'https://example.com/webhook',
          area_code: 415,
        }),
      );
    });
  });

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

  describe('update', () => {
    it('updates a phone number', async () => {
      mockPhoneNumber.update.mockResolvedValue(samplePhoneNumber);
      const provider = createRetell({ apiKey: 'test-key' });

      const pn = await provider.phoneNumbers.update('+15551234567', {
        name: 'Updated',
        inboundAgentId: 'agent_1',
        outboundAgentId: 'agent_2',
        webhookUrl: 'https://example.com/new',
      });

      expect(pn.id).toBe('+15551234567');
      expect(mockPhoneNumber.update).toHaveBeenCalledWith('+15551234567', {
        nickname: 'Updated',
        inbound_agent_id: 'agent_1',
        outbound_agent_id: 'agent_2',
        inbound_webhook_url: 'https://example.com/new',
      });
    });
  });

  describe('delete', () => {
    it('deletes a phone number', async () => {
      mockPhoneNumber.delete.mockResolvedValue(undefined);
      const provider = createRetell({ apiKey: 'test-key' });

      await provider.phoneNumbers.delete('+15551234567');
      expect(mockPhoneNumber.delete).toHaveBeenCalledWith('+15551234567');
    });
  });
});
