# voice-ai-sdk

Unified Voice AI SDK — one interface for multiple voice AI providers.

Wraps [Vapi](https://vapi.ai) and [Retell](https://retellai.com) behind a single API so you can switch providers without rewriting your application.

```bash
npm install voice-ai-sdk
```

## Quick Start

```typescript
import { createVapi, createRetell } from 'voice-ai-sdk';

// Pick a provider
const vapi = createVapi({ apiKey: process.env.VAPI_API_KEY! });
const retell = createRetell({ apiKey: process.env.RETELL_API_KEY! });

// Create an agent (Vapi assistant / Retell agent)
const agent = await vapi.agents.create({
  name: 'Support Bot',
  voice: { voiceId: 'jennifer' },
  model: { provider: 'openai', model: 'gpt-4', systemPrompt: 'You are a helpful assistant.' },
  firstMessage: 'Hello, how can I help you?',
  maxDurationSeconds: 300,
  backgroundSound: 'office',
  voicemailMessage: 'Sorry we missed you. Leave a message after the beep.',
  webhookUrl: 'https://example.com/webhook',
  webhookTimeoutSeconds: 20,
});

// Make an outbound call
const call = await vapi.calls.create({
  agentId: agent.id,
  toNumber: '+14155551234',
});

// List calls with pagination
const { items, hasMore, nextCursor } = await vapi.calls.list({ limit: 10 });
```

## Providers

### Vapi

```typescript
import { createVapi } from 'voice-ai-sdk';

const vapi = createVapi({ apiKey: 'your-vapi-api-key' });
```

Supports: `agents`, `calls`, `phoneNumbers`, `tools`, `files`

### Retell

```typescript
import { createRetell } from 'voice-ai-sdk';

const retell = createRetell({ apiKey: 'your-retell-api-key' });
```

Supports: `agents`, `calls`, `phoneNumbers`, `knowledgeBase`

## Resources

Every provider exposes these required managers:

| Manager | Methods | Notes |
|---------|---------|-------|
| `agents` | `create`, `list`, `get`, `update`, `delete` | Vapi assistants / Retell agents |
| `calls` | `create`, `list`, `get`, `update`, `delete` | Outbound calls |
| `phoneNumbers` | `list`, `get` | Read-only |

Optional managers (provider-dependent):

| Manager | Methods | Provider |
|---------|---------|----------|
| `tools` | `create`, `list`, `get`, `update`, `delete` | Vapi |
| `files` | `create`, `list`, `get`, `update`, `delete` | Vapi |
| `knowledgeBase` | `create`, `list`, `get`, `delete` | Retell |

## API Reference

### Agents

```typescript
const agent = await provider.agents.create({
  name: 'My Agent',
  voice: { voiceId: 'jennifer', provider: 'azure' },
  model: { provider: 'openai', model: 'gpt-4', systemPrompt: '...' },
  firstMessage: 'Hello!',
  metadata: { team: 'support' },
  providerOptions: { /* pass-through to underlying SDK */ },
});

const { items } = await provider.agents.list({ limit: 20, cursor: 'abc' });
const agent = await provider.agents.get('agent-id');
const updated = await provider.agents.update('agent-id', { name: 'New Name' });
await provider.agents.delete('agent-id');
```

### Calls

```typescript
const call = await provider.calls.create({
  agentId: 'agent-id',
  toNumber: '+14155551234',
  fromNumber: '+14155559999',
  metadata: { campaign: 'outreach' },
});

const { items } = await provider.calls.list({ limit: 10 });
const call = await provider.calls.get('call-id');
const updated = await provider.calls.update('call-id', { metadata: { note: 'VIP' } });
await provider.calls.delete('call-id');
```

The `Call` object includes `status` (`'queued' | 'ringing' | 'in-progress' | 'ended' | 'error' | 'unknown'`), `startedAt`, `endedAt`, `duration`, `transcript`, and `recordingUrl`.

### Phone Numbers

```typescript
const { items } = await provider.phoneNumbers.list({ limit: 10 });
const phone = await provider.phoneNumbers.get('phone-id');
```

### Tools (Vapi only)

```typescript
const tool = await provider.tools!.create({
  type: 'function',
  name: 'get_weather',
  description: 'Gets current weather',
});

const { items } = await provider.tools!.list();
const tool = await provider.tools!.get('tool-id');
const updated = await provider.tools!.update('tool-id', { description: 'Updated' });
await provider.tools!.delete('tool-id');
```

### Files (Vapi only)

```typescript
const file = await provider.files!.create({ file: buffer, name: 'doc.pdf' });
const { items } = await provider.files!.list();
const file = await provider.files!.get('file-id');
await provider.files!.delete('file-id');
```

### Knowledge Base (Retell only)

```typescript
const kb = await provider.knowledgeBase!.create({ name: 'FAQ' });
const { items } = await provider.knowledgeBase!.list();
const kb = await provider.knowledgeBase!.get('kb-id');
await provider.knowledgeBase!.delete('kb-id');
```

## Pagination

All `list` methods return a `PaginatedList<T>`:

```typescript
interface PaginatedList<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
}
```

Pass `cursor` and `limit` to paginate:

```typescript
let cursor: string | undefined;
do {
  const page = await provider.agents.list({ limit: 50, cursor });
  process.stdout.write(`Got ${page.items.length} agents\n`);
  cursor = page.nextCursor;
} while (cursor);
```

## Error Handling

All errors extend `VoiceAIError`:

```
VoiceAIError
  └── ProviderError         — wraps provider SDK errors, includes .provider and .cause
        ├── NotFoundError        — resource not found
        └── AuthenticationError  — invalid API key
```

```typescript
import { ProviderError, NotFoundError, AuthenticationError } from 'voice-ai-sdk';

try {
  await provider.agents.get('nonexistent');
} catch (err) {
  if (err instanceof NotFoundError) {
    console.log(`Not found via ${err.provider}`);
  } else if (err instanceof AuthenticationError) {
    console.log('Bad API key');
  } else if (err instanceof ProviderError) {
    console.log(`Provider error: ${err.message}`, err.cause);
  }
}
```

## Custom Providers

Build your own provider with `defineProvider` and register it alongside built-in ones:

```typescript
import { defineProvider, createVoiceRegistry, createVapi } from 'voice-ai-sdk';

const myProvider = defineProvider({
  providerId: 'my-provider',
  agents: { create, list, get, update, delete },      // required
  calls: { create, list, get, update, delete },        // required
  phoneNumbers: { list, get },                         // required
  tools: { create, list, get, update, delete },        // optional
  files: { create, list, get, update, delete },        // optional
  knowledgeBase: { create, list, get, delete },         // optional
});

const registry = createVoiceRegistry({
  vapi: createVapi({ apiKey: '...' }),
  custom: myProvider,
});

// Switch between providers at runtime
const provider = registry.provider('vapi');
const agents = await provider.agents.list();

registry.listProviders(); // ['vapi', 'custom']
```

`defineProvider` validates that all required managers and methods are present at initialization time.

## Development

```bash
npm test          # run tests (Jest)
npm run typecheck  # type-check without emitting (tsc --noEmit)
npm run build      # build CJS + ESM + DTS (tsup)
npm run test:watch # watch mode
```

Requires Node.js >= 18.

## License

ISC
