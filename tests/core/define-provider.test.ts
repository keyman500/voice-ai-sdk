import { defineProvider } from '../../src/core/define-provider';
import { VoiceAIError } from '../../src/core/errors';
import type { VoiceProvider } from '../../src/core/provider';

function makeMockProvider(overrides?: Partial<VoiceProvider>): VoiceProvider {
  const noop = () => Promise.resolve({} as never);
  return {
    providerId: 'test',
    agents: { create: noop, list: noop, get: noop, update: noop, delete: noop },
    calls: { create: noop, list: noop, get: noop, update: noop, delete: noop },
    phoneNumbers: { create: noop, list: noop, get: noop, update: noop, delete: noop },
    ...overrides,
  };
}

describe('defineProvider', () => {
  it('returns the provider when valid', () => {
    const provider = makeMockProvider();
    const result = defineProvider(provider);
    expect(result).toBe(provider);
  });

  it('throws if providerId is missing', () => {
    const provider = makeMockProvider({ providerId: '' });
    expect(() => defineProvider(provider)).toThrow(VoiceAIError);
    expect(() => defineProvider(provider)).toThrow('providerId');
  });

  it('throws if agents manager is missing', () => {
    const provider = makeMockProvider({ agents: undefined as never });
    expect(() => defineProvider(provider)).toThrow('agents manager is required');
  });

  it('throws if calls manager is missing', () => {
    const provider = makeMockProvider({ calls: undefined as never });
    expect(() => defineProvider(provider)).toThrow('calls manager is required');
  });

  it('throws if phoneNumbers manager is missing', () => {
    const provider = makeMockProvider({ phoneNumbers: undefined as never });
    expect(() => defineProvider(provider)).toThrow('phoneNumbers manager is required');
  });

  it('throws if agents.create is not a function', () => {
    const provider = makeMockProvider();
    (provider.agents as Record<string, unknown>).create = 'not a function';
    expect(() => defineProvider(provider)).toThrow('agents.create must be a function');
  });

  it('throws if calls.delete is not a function', () => {
    const provider = makeMockProvider();
    (provider.calls as Record<string, unknown>).delete = null;
    expect(() => defineProvider(provider)).toThrow('calls.delete must be a function');
  });

  it('throws if phoneNumbers.get is not a function', () => {
    const provider = makeMockProvider();
    (provider.phoneNumbers as Record<string, unknown>).get = 42;
    expect(() => defineProvider(provider)).toThrow('phoneNumbers.get must be a function');
  });

  it('throws if phoneNumbers.create is not a function', () => {
    const provider = makeMockProvider();
    (provider.phoneNumbers as Record<string, unknown>).create = 'bad';
    expect(() => defineProvider(provider)).toThrow('phoneNumbers.create must be a function');
  });

  it('accepts provider without optional managers', () => {
    const provider = makeMockProvider();
    const result = defineProvider(provider);
    expect(result).toBe(provider);
    expect(result.tools).toBeUndefined();
    expect(result.files).toBeUndefined();
    expect(result.knowledgeBase).toBeUndefined();
  });

  it('accepts provider with valid tools manager', () => {
    const noop = () => Promise.resolve({} as never);
    const provider = makeMockProvider({
      tools: { create: noop, list: noop, get: noop, update: noop, delete: noop },
    });
    const result = defineProvider(provider);
    expect(result.tools).toBeDefined();
  });

  it('throws if tools.create is not a function', () => {
    const noop = () => Promise.resolve({} as never);
    const provider = makeMockProvider({
      tools: { create: 'bad' as never, list: noop, get: noop, update: noop, delete: noop },
    });
    expect(() => defineProvider(provider)).toThrow('tools.create must be a function');
  });

  it('accepts provider with valid files manager', () => {
    const noop = () => Promise.resolve({} as never);
    const provider = makeMockProvider({
      files: { create: noop, list: noop, get: noop, update: noop, delete: noop },
    });
    const result = defineProvider(provider);
    expect(result.files).toBeDefined();
  });

  it('throws if files.get is not a function', () => {
    const noop = () => Promise.resolve({} as never);
    const provider = makeMockProvider({
      files: { create: noop, list: noop, get: null as never, update: noop, delete: noop },
    });
    expect(() => defineProvider(provider)).toThrow('files.get must be a function');
  });

  it('accepts provider with valid knowledgeBase manager', () => {
    const noop = () => Promise.resolve({} as never);
    const provider = makeMockProvider({
      knowledgeBase: { create: noop, list: noop, get: noop, delete: noop },
    });
    const result = defineProvider(provider);
    expect(result.knowledgeBase).toBeDefined();
  });

  it('throws if knowledgeBase.delete is not a function', () => {
    const noop = () => Promise.resolve({} as never);
    const provider = makeMockProvider({
      knowledgeBase: { create: noop, list: noop, get: noop, delete: 123 as never },
    });
    expect(() => defineProvider(provider)).toThrow('knowledgeBase.delete must be a function');
  });
});
