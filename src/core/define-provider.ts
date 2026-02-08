import type { VoiceProvider } from './provider.js';
import { VoiceAIError } from './errors.js';

export function defineProvider(config: VoiceProvider): VoiceProvider {
  if (!config.providerId || typeof config.providerId !== 'string') {
    throw new VoiceAIError('defineProvider: providerId must be a non-empty string');
  }
  if (!config.agents || typeof config.agents !== 'object') {
    throw new VoiceAIError('defineProvider: agents manager is required');
  }
  if (!config.calls || typeof config.calls !== 'object') {
    throw new VoiceAIError('defineProvider: calls manager is required');
  }
  if (!config.phoneNumbers || typeof config.phoneNumbers !== 'object') {
    throw new VoiceAIError('defineProvider: phoneNumbers manager is required');
  }

  const requiredAgentMethods = ['create', 'list', 'get', 'update', 'delete'] as const;
  for (const method of requiredAgentMethods) {
    if (typeof (config.agents as unknown as Record<string, unknown>)[method] !== 'function') {
      throw new VoiceAIError(`defineProvider: agents.${method} must be a function`);
    }
  }

  const requiredCallMethods = ['create', 'list', 'get', 'update', 'delete'] as const;
  for (const method of requiredCallMethods) {
    if (typeof (config.calls as unknown as Record<string, unknown>)[method] !== 'function') {
      throw new VoiceAIError(`defineProvider: calls.${method} must be a function`);
    }
  }

  const requiredPhoneNumberMethods = ['list', 'get'] as const;
  for (const method of requiredPhoneNumberMethods) {
    if (typeof (config.phoneNumbers as unknown as Record<string, unknown>)[method] !== 'function') {
      throw new VoiceAIError(`defineProvider: phoneNumbers.${method} must be a function`);
    }
  }

  if (config.tools) {
    const requiredToolMethods = ['create', 'list', 'get', 'update', 'delete'] as const;
    for (const method of requiredToolMethods) {
      if (typeof (config.tools as unknown as Record<string, unknown>)[method] !== 'function') {
        throw new VoiceAIError(`defineProvider: tools.${method} must be a function`);
      }
    }
  }

  if (config.files) {
    const requiredFileMethods = ['create', 'list', 'get', 'update', 'delete'] as const;
    for (const method of requiredFileMethods) {
      if (typeof (config.files as unknown as Record<string, unknown>)[method] !== 'function') {
        throw new VoiceAIError(`defineProvider: files.${method} must be a function`);
      }
    }
  }

  if (config.knowledgeBase) {
    const requiredKbMethods = ['create', 'list', 'get', 'delete'] as const;
    for (const method of requiredKbMethods) {
      if (typeof (config.knowledgeBase as unknown as Record<string, unknown>)[method] !== 'function') {
        throw new VoiceAIError(`defineProvider: knowledgeBase.${method} must be a function`);
      }
    }
  }

  return config;
}
