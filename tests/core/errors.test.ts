import {
  VoiceAIError,
  ProviderError,
  NotFoundError,
  AuthenticationError,
} from '../../src/core/errors';

describe('VoiceAIError', () => {
  it('sets name and message', () => {
    const err = new VoiceAIError('something broke');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('VoiceAIError');
    expect(err.message).toBe('something broke');
  });
});

describe('ProviderError', () => {
  it('prefixes message with provider name', () => {
    const err = new ProviderError('vapi', 'request failed');
    expect(err).toBeInstanceOf(VoiceAIError);
    expect(err.name).toBe('ProviderError');
    expect(err.message).toBe('[vapi] request failed');
    expect(err.provider).toBe('vapi');
  });

  it('stores cause', () => {
    const cause = new Error('original');
    const err = new ProviderError('retell', 'wrapped', cause);
    expect(err.cause).toBe(cause);
  });
});

describe('NotFoundError', () => {
  it('formats resource not found message', () => {
    const err = new NotFoundError('vapi', 'Agent', 'abc123');
    expect(err).toBeInstanceOf(ProviderError);
    expect(err.name).toBe('NotFoundError');
    expect(err.message).toBe('[vapi] Agent not found: abc123');
    expect(err.provider).toBe('vapi');
  });
});

describe('AuthenticationError', () => {
  it('formats auth error message', () => {
    const err = new AuthenticationError('retell');
    expect(err).toBeInstanceOf(ProviderError);
    expect(err.name).toBe('AuthenticationError');
    expect(err.message).toContain('Authentication failed');
    expect(err.provider).toBe('retell');
  });
});
