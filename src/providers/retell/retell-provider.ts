import Retell from 'retell-sdk';
import type { VoiceProvider } from '../../core/provider.js';
import { RetellAgentManager } from './retell-agent-manager.js';
import { RetellCallManager } from './retell-call-manager.js';
import { RetellPhoneNumberManager } from './retell-phone-number-manager.js';
import { RetellKnowledgeBaseManager } from './retell-knowledge-base-manager.js';

export interface RetellConfig {
  apiKey: string;
}

export function createRetell(config: RetellConfig): VoiceProvider {
  const client = new Retell({ apiKey: config.apiKey });

  return {
    providerId: 'retell',
    agents: new RetellAgentManager(client),
    calls: new RetellCallManager(client),
    phoneNumbers: new RetellPhoneNumberManager(client),
    knowledgeBase: new RetellKnowledgeBaseManager(client),
  };
}
