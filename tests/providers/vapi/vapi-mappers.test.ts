import {
  mapAssistantToAgent,
  mapCreateAgentToVapi,
  mapUpdateAgentToVapi,
  mapVapiCallToCall,
  mapCreateCallToVapi,
  mapVapiPhoneNumber,
  mapVapiToolToTool,
  mapVapiFileToFile,
} from '../../../src/providers/vapi/vapi-mappers';

describe('Vapi Mappers', () => {
  describe('mapAssistantToAgent', () => {
    it('maps a full assistant to unified Agent', () => {
      const assistant = {
        id: 'asst_1',
        name: 'Sales Bot',
        voice: { voiceId: 'rachel', provider: '11labs' },
        model: {
          provider: 'openai',
          model: 'gpt-4',
          messages: [{ role: 'system', content: 'You are helpful.' }],
        },
        firstMessage: 'Hello!',
        metadata: { key: 'value' },
        orgId: 'org_1',
        createdAt: '2024-01-01T00:00:00Z',
      };

      const agent = mapAssistantToAgent(assistant);
      expect(agent.id).toBe('asst_1');
      expect(agent.provider).toBe('vapi');
      expect(agent.name).toBe('Sales Bot');
      expect(agent.voice).toEqual({ voiceId: 'rachel', provider: '11labs' });
      expect(agent.model).toEqual({
        provider: 'openai',
        model: 'gpt-4',
        systemPrompt: 'You are helpful.',
      });
      expect(agent.firstMessage).toBe('Hello!');
      expect(agent.metadata).toEqual({ key: 'value' });
      expect(agent.raw).toBe(assistant);
    });

    it('handles missing optional fields', () => {
      const agent = mapAssistantToAgent({ id: 'asst_2' });
      expect(agent.id).toBe('asst_2');
      expect(agent.name).toBeUndefined();
      expect(agent.voice).toBeUndefined();
      expect(agent.model).toBeUndefined();
      expect(agent.firstMessage).toBeUndefined();
    });
  });

  describe('mapCreateAgentToVapi', () => {
    it('maps unified create params to Vapi DTO', () => {
      const result = mapCreateAgentToVapi({
        name: 'My Agent',
        voice: { voiceId: 'rachel', provider: '11labs' },
        model: { provider: 'openai', model: 'gpt-4', systemPrompt: 'Be nice.' },
        firstMessage: 'Hi there',
        metadata: { foo: 'bar' },
      });

      expect(result.name).toBe('My Agent');
      expect(result.firstMessage).toBe('Hi there');
      expect(result.metadata).toEqual({ foo: 'bar' });
      expect(result.voice).toEqual({ voiceId: 'rachel', provider: '11labs' });
      expect(result.model).toEqual({
        provider: 'openai',
        model: 'gpt-4',
        messages: [{ role: 'system', content: 'Be nice.' }],
      });
    });

    it('passes through providerOptions', () => {
      const result = mapCreateAgentToVapi({
        name: 'Agent',
        providerOptions: { maxDurationSeconds: 300, endCallMessage: 'Bye' },
      });
      expect(result.maxDurationSeconds).toBe(300);
      expect(result.endCallMessage).toBe('Bye');
    });

    it('handles empty params', () => {
      const result = mapCreateAgentToVapi({});
      expect(Object.keys(result)).toHaveLength(0);
    });
  });

  describe('mapUpdateAgentToVapi', () => {
    it('includes id in the DTO', () => {
      const result = mapUpdateAgentToVapi('asst_1', { name: 'Updated' });
      expect(result.id).toBe('asst_1');
      expect(result.name).toBe('Updated');
    });
  });

  describe('mapVapiCallToCall', () => {
    it('maps a full Vapi call to unified Call', () => {
      const vapiCall = {
        id: 'call_1',
        assistantId: 'asst_1',
        status: 'in-progress',
        startedAt: '2024-01-01T00:00:00Z',
        endedAt: '2024-01-01T00:05:00Z',
        customer: { number: '+15551234567' },
        phoneNumber: { number: '+15559876543' },
        artifact: {
          transcript: 'Hello world',
          recordingUrl: 'https://example.com/recording.mp3',
        },
      };

      const call = mapVapiCallToCall(vapiCall);
      expect(call.id).toBe('call_1');
      expect(call.provider).toBe('vapi');
      expect(call.agentId).toBe('asst_1');
      expect(call.toNumber).toBe('+15551234567');
      expect(call.fromNumber).toBe('+15559876543');
      expect(call.status).toBe('in-progress');
      expect(call.startedAt).toEqual(new Date('2024-01-01T00:00:00Z'));
      expect(call.endedAt).toEqual(new Date('2024-01-01T00:05:00Z'));
      expect(call.duration).toBe(300);
      expect(call.transcript).toBe('Hello world');
      expect(call.recordingUrl).toBe('https://example.com/recording.mp3');
      expect(call.raw).toBe(vapiCall);
    });

    it('maps queued status', () => {
      expect(mapVapiCallToCall({ id: 'c', status: 'queued' }).status).toBe('queued');
    });

    it('maps ringing status', () => {
      expect(mapVapiCallToCall({ id: 'c', status: 'ringing' }).status).toBe('ringing');
    });

    it('maps ended status', () => {
      expect(mapVapiCallToCall({ id: 'c', status: 'ended' }).status).toBe('ended');
    });

    it('maps unknown status for unrecognized values', () => {
      expect(mapVapiCallToCall({ id: 'c', status: 'scheduled' }).status).toBe('unknown');
    });

    it('handles missing dates', () => {
      const call = mapVapiCallToCall({ id: 'c' });
      expect(call.startedAt).toBeUndefined();
      expect(call.endedAt).toBeUndefined();
      expect(call.duration).toBeUndefined();
    });
  });

  describe('mapCreateCallToVapi', () => {
    it('maps create call params', () => {
      const result = mapCreateCallToVapi({
        agentId: 'asst_1',
        toNumber: '+15551234567',
        fromNumber: 'pn_123',
      });

      expect(result.assistantId).toBe('asst_1');
      expect(result.customer).toEqual({ number: '+15551234567' });
      expect(result.phoneNumberId).toBe('pn_123');
    });
  });

  describe('mapVapiPhoneNumber', () => {
    it('maps a Vapi phone number to unified PhoneNumber', () => {
      const pn = {
        id: 'pn_1',
        number: '+15551234567',
        name: 'Main Line',
        assistantId: 'asst_1',
      };

      const result = mapVapiPhoneNumber(pn);
      expect(result.id).toBe('pn_1');
      expect(result.provider).toBe('vapi');
      expect(result.number).toBe('+15551234567');
      expect(result.name).toBe('Main Line');
      expect(result.agentId).toBe('asst_1');
      expect(result.raw).toBe(pn);
    });
  });

  describe('mapVapiToolToTool', () => {
    it('maps a Vapi function tool to unified Tool', () => {
      const tool = {
        id: 'tool_1',
        type: 'function',
        function: {
          name: 'get_weather',
          description: 'Gets the weather',
        },
        orgId: 'org_1',
        createdAt: '2024-01-01T00:00:00Z',
      };

      const result = mapVapiToolToTool(tool);
      expect(result.id).toBe('tool_1');
      expect(result.provider).toBe('vapi');
      expect(result.type).toBe('function');
      expect(result.name).toBe('get_weather');
      expect(result.description).toBe('Gets the weather');
      expect(result.raw).toBe(tool);
    });

    it('handles tool without function', () => {
      const tool = {
        id: 'tool_2',
        type: 'endCall',
      };

      const result = mapVapiToolToTool(tool);
      expect(result.id).toBe('tool_2');
      expect(result.type).toBe('endCall');
      expect(result.name).toBeUndefined();
      expect(result.description).toBeUndefined();
    });
  });

  describe('mapVapiFileToFile', () => {
    it('maps a Vapi file to unified VoiceFile', () => {
      const file = {
        id: 'file_1',
        name: 'transcript.txt',
        status: 'done',
        bytes: 1024,
        url: 'https://storage.example.com/file_1',
        mimetype: 'text/plain',
        metadata: { source: 'upload' },
        orgId: 'org_1',
      };

      const result = mapVapiFileToFile(file);
      expect(result.id).toBe('file_1');
      expect(result.provider).toBe('vapi');
      expect(result.name).toBe('transcript.txt');
      expect(result.status).toBe('done');
      expect(result.bytes).toBe(1024);
      expect(result.url).toBe('https://storage.example.com/file_1');
      expect(result.mimeType).toBe('text/plain');
      expect(result.metadata).toEqual({ source: 'upload' });
      expect(result.raw).toBe(file);
    });

    it('maps processing status', () => {
      expect(mapVapiFileToFile({ id: 'f', status: 'processing' }).status).toBe('processing');
    });

    it('maps failed status', () => {
      expect(mapVapiFileToFile({ id: 'f', status: 'failed' }).status).toBe('failed');
    });

    it('maps unknown status for unrecognized values', () => {
      expect(mapVapiFileToFile({ id: 'f', status: 'other' }).status).toBe('unknown');
    });

    it('handles missing optional fields', () => {
      const result = mapVapiFileToFile({ id: 'f' });
      expect(result.name).toBeUndefined();
      expect(result.bytes).toBeUndefined();
      expect(result.url).toBeUndefined();
      expect(result.mimeType).toBeUndefined();
      expect(result.status).toBe('unknown');
    });
  });
});
