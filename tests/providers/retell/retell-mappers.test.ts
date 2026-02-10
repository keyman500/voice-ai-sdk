import {
  mapRetellAgentToAgent,
  mapCreateAgentToRetell,
  mapUpdateAgentToRetell,
  mapRetellCallToCall,
  mapCreateCallToRetell,
  mapCreatePhoneNumberToRetell,
  mapUpdatePhoneNumberToRetell,
  mapRetellPhoneNumber,
  mapRetellKnowledgeBase,
} from '../../../src/providers/retell/retell-mappers';
import { ProviderError } from '../../../src/core/errors';

describe('Retell Mappers', () => {
  describe('mapRetellAgentToAgent', () => {
    it('maps a full Retell agent to unified Agent', () => {
      const retellAgent = {
        agent_id: 'agent_1',
        agent_name: 'Support Bot',
        voice_id: 'emma',
        response_engine: {
          type: 'retell-llm',
          llm_id: 'llm_123',
        },
        begin_message: 'Hi there!',
        last_modification_timestamp: 1700000000000,
      };

      const agent = mapRetellAgentToAgent(retellAgent);
      expect(agent.id).toBe('agent_1');
      expect(agent.provider).toBe('retell');
      expect(agent.name).toBe('Support Bot');
      expect(agent.voice).toEqual({ voiceId: 'emma' });
      expect(agent.model).toEqual({ provider: 'retell-llm', model: 'llm_123' });
      expect(agent.firstMessage).toBe('Hi there!');
      expect(agent.raw).toBe(retellAgent);
    });

    it('handles custom-llm response engine', () => {
      const agent = mapRetellAgentToAgent({
        agent_id: 'a2',
        response_engine: {
          type: 'custom-llm',
          llm_websocket_url: 'wss://my-llm.example.com',
        },
      });
      expect(agent.model).toEqual({
        provider: 'custom-llm',
        model: 'wss://my-llm.example.com',
      });
    });

    it('handles missing optional fields', () => {
      const agent = mapRetellAgentToAgent({ agent_id: 'a3' });
      expect(agent.id).toBe('a3');
      expect(agent.name).toBeUndefined();
      expect(agent.voice).toBeUndefined();
      expect(agent.model).toBeUndefined();
      expect(agent.firstMessage).toBeUndefined();
    });
  });

  describe('mapCreateAgentToRetell', () => {
    it('maps unified create params to Retell format', () => {
      const result = mapCreateAgentToRetell({
        name: 'My Agent',
        voice: { voiceId: 'emma' },
        model: { provider: 'retell-llm', model: 'llm_123' },
        firstMessage: 'Hello!',
        maxDurationSeconds: 300,
        backgroundSound: 'coffee-shop',
        voicemailMessage: 'Please leave a message.',
        webhookUrl: 'https://example.com/webhook',
        webhookTimeoutSeconds: 12,
      });

      expect(result.agent_name).toBe('My Agent');
      expect(result.voice_id).toBe('emma');
      expect(result.response_engine).toEqual({
        type: 'retell-llm',
        llm_id: 'llm_123',
      });
      expect(result.begin_message).toBe('Hello!');
      expect(result.max_call_duration_ms).toBe(300000);
      expect(result.ambient_sound).toBe('coffee-shop');
      expect(result.webhook_url).toBe('https://example.com/webhook');
      expect(result.webhook_timeout_ms).toBe(12000);
      expect(result.voicemail_option).toEqual({
        action: {
          type: 'static_text',
          text: 'Please leave a message.',
        },
      });
    });

    it('passes through providerOptions', () => {
      const result = mapCreateAgentToRetell({
        name: 'Agent',
        providerOptions: { language: 'en-US', enable_backchannel: true },
      });
      expect(result.language).toBe('en-US');
      expect(result.enable_backchannel).toBe(true);
    });

    it('handles empty params', () => {
      const result = mapCreateAgentToRetell({});
      expect(Object.keys(result)).toHaveLength(0);
    });
  });

  describe('mapUpdateAgentToRetell', () => {
    it('maps update params to Retell format', () => {
      const result = mapUpdateAgentToRetell({ name: 'Updated' });
      expect(result.agent_name).toBe('Updated');
    });

    it('maps overlapping fields on update', () => {
      const result = mapUpdateAgentToRetell({
        maxDurationSeconds: 60,
        backgroundSound: 'static-noise',
        voicemailMessage: 'Bye.',
        webhookUrl: 'https://example.com/wh',
        webhookTimeoutSeconds: 9,
      });

      expect(result.max_call_duration_ms).toBe(60000);
      expect(result.ambient_sound).toBe('static-noise');
      expect(result.webhook_url).toBe('https://example.com/wh');
      expect(result.webhook_timeout_ms).toBe(9000);
      expect(result.voicemail_option).toEqual({
        action: {
          type: 'static_text',
          text: 'Bye.',
        },
      });
    });
  });

  describe('mapRetellCallToCall', () => {
    it('maps a full Retell call to unified Call', () => {
      const retellCall = {
        call_id: 'call_1',
        agent_id: 'agent_1',
        call_status: 'ended',
        to_number: '+15551234567',
        from_number: '+15559876543',
        start_timestamp: 1700000000000,
        end_timestamp: 1700000300000,
        duration_ms: 300000,
        transcript: 'Hello world',
        recording_url: 'https://r.com/a.mp3',
        metadata: { key: 'val' },
      };

      const call = mapRetellCallToCall(retellCall);
      expect(call.id).toBe('call_1');
      expect(call.provider).toBe('retell');
      expect(call.agentId).toBe('agent_1');
      expect(call.toNumber).toBe('+15551234567');
      expect(call.fromNumber).toBe('+15559876543');
      expect(call.status).toBe('ended');
      expect(call.startedAt).toEqual(new Date(1700000000000));
      expect(call.endedAt).toEqual(new Date(1700000300000));
      expect(call.duration).toBe(300);
      expect(call.transcript).toBe('Hello world');
      expect(call.recordingUrl).toBe('https://r.com/a.mp3');
      expect(call.metadata).toEqual({ key: 'val' });
      expect(call.raw).toBe(retellCall);
    });

    it('maps registered to queued', () => {
      expect(mapRetellCallToCall({ call_id: 'c', call_status: 'registered' }).status).toBe('queued');
    });

    it('maps ongoing to in-progress', () => {
      expect(mapRetellCallToCall({ call_id: 'c', call_status: 'ongoing' }).status).toBe('in-progress');
    });

    it('maps error status', () => {
      expect(mapRetellCallToCall({ call_id: 'c', call_status: 'error' }).status).toBe('error');
    });

    it('maps not_connected to unknown', () => {
      expect(mapRetellCallToCall({ call_id: 'c', call_status: 'not_connected' }).status).toBe('unknown');
    });

    it('handles missing timestamps', () => {
      const call = mapRetellCallToCall({ call_id: 'c' });
      expect(call.startedAt).toBeUndefined();
      expect(call.endedAt).toBeUndefined();
      expect(call.duration).toBeUndefined();
    });
  });

  describe('mapCreateCallToRetell', () => {
    it('maps create call params', () => {
      const result = mapCreateCallToRetell({
        agentId: 'agent_1',
        toNumber: '+15551234567',
        fromNumber: '+15559876543',
        metadata: { source: 'test' },
      });

      expect(result.agent_id).toBe('agent_1');
      expect(result.to_number).toBe('+15551234567');
      expect(result.from_number).toBe('+15559876543');
      expect(result.metadata).toEqual({ source: 'test' });
    });
  });

  describe('mapCreatePhoneNumberToRetell', () => {
    it('maps unified phone number params to Retell format', () => {
      const result = mapCreatePhoneNumberToRetell({
        name: 'Main Line',
        inboundAgentId: 'agent_1',
        outboundAgentId: 'agent_2',
        webhookUrl: 'https://example.com/webhook',
        areaCode: '415',
      });

      expect(result).toEqual({
        nickname: 'Main Line',
        inbound_agent_id: 'agent_1',
        outbound_agent_id: 'agent_2',
        inbound_webhook_url: 'https://example.com/webhook',
        area_code: 415,
      });
    });

    it('throws on invalid areaCode', () => {
      expect(() => mapCreatePhoneNumberToRetell({ areaCode: 'abc' })).toThrow(ProviderError);
    });
  });

  describe('mapUpdatePhoneNumberToRetell', () => {
    it('maps unified phone number update params', () => {
      const result = mapUpdatePhoneNumberToRetell({
        name: 'Updated',
        inboundAgentId: 'agent_1',
        outboundAgentId: 'agent_2',
        webhookUrl: 'https://example.com/new',
      });

      expect(result).toEqual({
        nickname: 'Updated',
        inbound_agent_id: 'agent_1',
        outbound_agent_id: 'agent_2',
        inbound_webhook_url: 'https://example.com/new',
      });
    });
  });

  describe('mapRetellPhoneNumber', () => {
    it('maps a Retell phone number to unified PhoneNumber', () => {
      const pn = {
        phone_number: '+15551234567',
        nickname: 'Main Line',
        inbound_agent_id: 'agent_1',
        phone_number_pretty: '(555) 123-4567',
      };

      const result = mapRetellPhoneNumber(pn);
      expect(result.id).toBe('+15551234567');
      expect(result.provider).toBe('retell');
      expect(result.number).toBe('+15551234567');
      expect(result.name).toBe('Main Line');
      expect(result.agentId).toBe('agent_1');
      expect(result.raw).toBe(pn);
    });
  });

  describe('mapRetellKnowledgeBase', () => {
    it('maps a full Retell knowledge base to unified KnowledgeBase', () => {
      const kb = {
        knowledge_base_id: 'kb_1',
        knowledge_base_name: 'Product FAQ',
        status: 'complete',
        knowledge_base_sources: [
          { source_id: 'src_1', type: 'url', url: 'https://example.com/faq' },
          { source_id: 'src_2', type: 'document', file_url: 'https://storage.example.com/doc.pdf' },
          { source_id: 'src_3', type: 'text', content_url: 'https://storage.example.com/text.txt' },
        ],
      };

      const result = mapRetellKnowledgeBase(kb);
      expect(result.id).toBe('kb_1');
      expect(result.provider).toBe('retell');
      expect(result.name).toBe('Product FAQ');
      expect(result.status).toBe('complete');
      expect(result.sources).toHaveLength(3);
      expect(result.sources[0]).toEqual({ id: 'src_1', type: 'url', url: 'https://example.com/faq' });
      expect(result.sources[1]).toEqual({ id: 'src_2', type: 'document', url: 'https://storage.example.com/doc.pdf' });
      expect(result.sources[2]).toEqual({ id: 'src_3', type: 'text', url: 'https://storage.example.com/text.txt' });
      expect(result.raw).toBe(kb);
    });

    it('handles knowledge base without sources', () => {
      const kb = {
        knowledge_base_id: 'kb_2',
        knowledge_base_name: 'Empty KB',
        status: 'in_progress',
      };

      const result = mapRetellKnowledgeBase(kb);
      expect(result.id).toBe('kb_2');
      expect(result.name).toBe('Empty KB');
      expect(result.status).toBe('in_progress');
      expect(result.sources).toEqual([]);
    });

    it('handles error status', () => {
      const kb = {
        knowledge_base_id: 'kb_3',
        knowledge_base_name: 'Failed KB',
        status: 'error',
      };

      const result = mapRetellKnowledgeBase(kb);
      expect(result.status).toBe('error');
    });
  });
});
