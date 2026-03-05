import { SipClient, RoomServiceClient, AgentDispatchClient } from 'livekit-server-sdk';
import type { VoiceProvider } from '../../core/provider.js';
import { LiveKitAgentManager } from './livekit-agent-manager.js';
import { LiveKitCallManager } from './livekit-call-manager.js';
import { LiveKitPhoneNumberManager } from './livekit-phone-number-manager.js';

export interface LiveKitConfig {
  apiKey: string;
  secret: string;
  host: string;
}

export interface LiveKitProvider extends VoiceProvider {
  readonly calls: LiveKitCallManager;
}

export function createLiveKit(config: LiveKitConfig): LiveKitProvider {
  const sipClient = new SipClient(config.host, config.apiKey, config.secret);
  const roomService = new RoomServiceClient(config.host, config.apiKey, config.secret);
  const agentDispatch = new AgentDispatchClient(config.host, config.apiKey, config.secret);

  return {
    providerId: 'livekit',
    agents: new LiveKitAgentManager(sipClient),
    calls: new LiveKitCallManager(sipClient, roomService, agentDispatch),
    phoneNumbers: new LiveKitPhoneNumberManager(config.host, config.apiKey, config.secret),
  };
}
