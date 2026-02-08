import { VapiClient } from '@vapi-ai/server-sdk';
import type { VoiceProvider } from '../../core/provider.js';
import { VapiAgentManager } from './vapi-agent-manager.js';
import { VapiCallManager } from './vapi-call-manager.js';
import { VapiPhoneNumberManager } from './vapi-phone-number-manager.js';
import { VapiToolManager } from './vapi-tool-manager.js';
import { VapiFileManager } from './vapi-file-manager.js';

export interface VapiConfig {
  apiKey: string;
}

export function createVapi(config: VapiConfig): VoiceProvider {
  const client = new VapiClient({ token: config.apiKey });

  return {
    providerId: 'vapi',
    agents: new VapiAgentManager(client),
    calls: new VapiCallManager(client),
    phoneNumbers: new VapiPhoneNumberManager(client),
    tools: new VapiToolManager(client),
    files: new VapiFileManager(client),
  };
}
