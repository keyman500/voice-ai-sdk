import type { VoiceProvider } from './provider.js';
import { VoiceAIError } from './errors.js';

export interface VoiceRegistry {
  provider(id: string): VoiceProvider;
  listProviders(): string[];
}

export function createVoiceRegistry(
  providers: Record<string, VoiceProvider>,
): VoiceRegistry {
  const map = new Map<string, VoiceProvider>();

  for (const [key, provider] of Object.entries(providers)) {
    map.set(key, provider);
  }

  return {
    provider(id: string): VoiceProvider {
      const p = map.get(id);
      if (!p) {
        throw new VoiceAIError(
          `Provider "${id}" not found. Available: ${[...map.keys()].join(', ')}`,
        );
      }
      return p;
    },
    listProviders(): string[] {
      return [...map.keys()];
    },
  };
}
