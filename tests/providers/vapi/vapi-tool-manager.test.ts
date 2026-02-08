jest.mock('@vapi-ai/server-sdk');

import { VapiClient } from '@vapi-ai/server-sdk';
import { createVapi } from '../../../src/providers/vapi';
import { ProviderError, NotFoundError, AuthenticationError } from '../../../src/core/errors';

const MockedVapiClient = VapiClient as jest.MockedClass<typeof VapiClient>;

const sampleTool = {
  id: 'tool_1',
  type: 'function',
  function: {
    name: 'get_weather',
    description: 'Gets the weather for a location',
  },
  orgId: 'org_1',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

let mockTools: Record<string, jest.Mock>;

beforeEach(() => {
  jest.clearAllMocks();
  mockTools = {
    create: jest.fn(),
    list: jest.fn(),
    get: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  MockedVapiClient.mockImplementation(() => ({
    tools: mockTools,
  } as unknown as VapiClient));
});

describe('VapiToolManager', () => {
  describe('create', () => {
    it('creates a tool and returns unified type', async () => {
      mockTools.create.mockResolvedValue(sampleTool);
      const provider = createVapi({ apiKey: 'test-key' });

      const tool = await provider.tools!.create({
        type: 'function',
        name: 'get_weather',
        description: 'Gets the weather for a location',
      });

      expect(tool.id).toBe('tool_1');
      expect(tool.provider).toBe('vapi');
      expect(tool.type).toBe('function');
      expect(tool.name).toBe('get_weather');
      expect(tool.description).toBe('Gets the weather for a location');
      expect(mockTools.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'function',
          function: { name: 'get_weather', description: 'Gets the weather for a location' },
        }),
      );
    });

    it('wraps errors as ProviderError', async () => {
      mockTools.create.mockRejectedValue(new Error('network error'));
      const provider = createVapi({ apiKey: 'test-key' });

      await expect(
        provider.tools!.create({ type: 'function' }),
      ).rejects.toThrow(ProviderError);
    });

    it('wraps 401 as AuthenticationError', async () => {
      mockTools.create.mockRejectedValue(
        Object.assign(new Error('unauthorized'), { statusCode: 401 }),
      );
      const provider = createVapi({ apiKey: 'test-key' });

      await expect(
        provider.tools!.create({ type: 'function' }),
      ).rejects.toThrow(AuthenticationError);
    });
  });

  describe('list', () => {
    it('returns paginated list of tools', async () => {
      mockTools.list.mockResolvedValue([sampleTool]);
      const provider = createVapi({ apiKey: 'test-key' });

      const result = await provider.tools!.list({ limit: 10 });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('tool_1');
      expect(result.items[0].name).toBe('get_weather');
      expect(result.hasMore).toBe(false);
    });

    it('handles no params', async () => {
      mockTools.list.mockResolvedValue([]);
      const provider = createVapi({ apiKey: 'test-key' });

      const result = await provider.tools!.list();
      expect(result.items).toEqual([]);
    });
  });

  describe('get', () => {
    it('gets a tool by id', async () => {
      mockTools.get.mockResolvedValue(sampleTool);
      const provider = createVapi({ apiKey: 'test-key' });

      const tool = await provider.tools!.get('tool_1');
      expect(tool.id).toBe('tool_1');
      expect(tool.type).toBe('function');
      expect(mockTools.get).toHaveBeenCalledWith({ id: 'tool_1' });
    });

    it('throws NotFoundError on 404', async () => {
      mockTools.get.mockRejectedValue(
        Object.assign(new Error('not found'), { statusCode: 404 }),
      );
      const provider = createVapi({ apiKey: 'test-key' });

      await expect(provider.tools!.get('tool_missing')).rejects.toThrow(NotFoundError);
    });
  });

  describe('update', () => {
    it('updates and returns unified tool', async () => {
      const updated = {
        ...sampleTool,
        function: { ...sampleTool.function, name: 'get_forecast' },
      };
      mockTools.update.mockResolvedValue(updated);
      const provider = createVapi({ apiKey: 'test-key' });

      const tool = await provider.tools!.update('tool_1', { name: 'get_forecast' });
      expect(tool.name).toBe('get_forecast');
      expect(mockTools.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'tool_1',
          body: expect.objectContaining({
            function: { name: 'get_forecast', description: undefined },
          }),
        }),
      );
    });
  });

  describe('delete', () => {
    it('deletes a tool', async () => {
      mockTools.delete.mockResolvedValue(sampleTool);
      const provider = createVapi({ apiKey: 'test-key' });

      await provider.tools!.delete('tool_1');
      expect(mockTools.delete).toHaveBeenCalledWith({ id: 'tool_1' });
    });

    it('throws NotFoundError on 404', async () => {
      mockTools.delete.mockRejectedValue(
        Object.assign(new Error('not found'), { statusCode: 404 }),
      );
      const provider = createVapi({ apiKey: 'test-key' });

      await expect(provider.tools!.delete('tool_missing')).rejects.toThrow(NotFoundError);
    });
  });
});
