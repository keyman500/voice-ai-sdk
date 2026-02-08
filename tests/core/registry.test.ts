import { createVoiceRegistry } from '../../src/core/registry';
import { VoiceAIError } from '../../src/core/errors';
import type { VoiceProvider } from '../../src/core/provider';

function stubProvider(id: string): VoiceProvider {
  const noop = () => Promise.resolve({} as never);
  return {
    providerId: id,
    agents: { create: noop, list: noop, get: noop, update: noop, delete: noop },
    calls: { create: noop, list: noop, get: noop, update: noop, delete: noop },
    phoneNumbers: { list: noop, get: noop },
  };
}

describe('createVoiceRegistry', () => {
  it('retrieves a registered provider', () => {
    const vapi = stubProvider('vapi');
    const registry = createVoiceRegistry({ vapi });
    expect(registry.provider('vapi')).toBe(vapi);
  });

  it('throws for unknown provider', () => {
    const registry = createVoiceRegistry({ vapi: stubProvider('vapi') });
    expect(() => registry.provider('retell')).toThrow(VoiceAIError);
    expect(() => registry.provider('retell')).toThrow('Provider "retell" not found');
  });

  it('lists registered providers', () => {
    const registry = createVoiceRegistry({
      vapi: stubProvider('vapi'),
      retell: stubProvider('retell'),
    });
    expect(registry.listProviders().sort()).toEqual(['retell', 'vapi']);
  });

  it('handles empty registry', () => {
    const registry = createVoiceRegistry({});
    expect(registry.listProviders()).toEqual([]);
    expect(() => registry.provider('any')).toThrow('not found');
  });
});
