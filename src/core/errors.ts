export class VoiceAIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VoiceAIError';
  }
}

export class ProviderError extends VoiceAIError {
  public readonly provider: string;
  public readonly cause?: unknown;

  constructor(provider: string, message: string, cause?: unknown) {
    super(`[${provider}] ${message}`);
    this.name = 'ProviderError';
    this.provider = provider;
    this.cause = cause;
  }
}

export class NotFoundError extends ProviderError {
  constructor(provider: string, resource: string, id: string) {
    super(provider, `${resource} not found: ${id}`);
    this.name = 'NotFoundError';
  }
}

export class AuthenticationError extends ProviderError {
  constructor(provider: string) {
    super(provider, 'Authentication failed. Check your API key.');
    this.name = 'AuthenticationError';
  }
}
