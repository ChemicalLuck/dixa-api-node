# Dixa API Client for Node.js

## Installation

Install using your choice of package manager from npm:

```bash
npm install @ChemicalLuck/dixa-api-node
```

## Usage

```typescript
import { Dixa } from "@ChemicalLuck/dixa-api-node";

const dixa = new Dixa("your-access-token");

const tags = await dixa.v1.tags.list();

console.log(tags);
```

Methods resolve to the payload itself, not Dixa's `{ data, meta }` envelope:

```typescript
const conversation = await dixa.v1.conversations.get("123");
conversation.id; // "123"
```

> **Upgrading from 1.x?** Reads used to resolve to the whole envelope, so
> callers had to unwrap `result.data` themselves. See [CHANGELOG.md](./CHANGELOG.md)
> for the migration.

## Options

```typescript
const dixa = new Dixa("your-access-token", {
  baseURL: "https://dev.dixa.io", // default
  timeout: 30_000, // default; 0 waits forever
  headers: { "X-Request-Source": "dispatch-board" },
  retry: { retries: 2 },
  logger: { warn: (message, context) => log.warn({ ...context }, message) },
});
```

| Option    | Default                 | Notes                                                             |
| --------- | ----------------------- | ----------------------------------------------------------------- |
| `baseURL` | `https://dev.dixa.io`   | Dixa's API host.                                                  |
| `timeout` | `30000`                 | Per-request timeout in ms. `0` waits indefinitely.                |
| `headers` | –                       | Extra headers sent with every request.                            |
| `retry`   | 2 retries               | See [Retries](#retries). `false` disables it.                     |
| `logger`  | – (silent)              | Opt in to diagnostics. Nothing is written to the console.         |
| `adapter` | –                       | Replaces the axios transport. For tests and custom hosts.         |

## Error handling

Every failure rejects with a `DixaApiError` carrying the HTTP status, the
request that failed and the Dixa error body, so a caller can classify a failure
without reaching into the underlying axios error:

```typescript
import { Dixa, DixaApiError, isDixaApiError } from "@ChemicalLuck/dixa-api-node";

try {
  await dixa.v1.conversations.get("123");
} catch (error) {
  if (!isDixaApiError(error)) throw error;

  error.message; // 'Dixa GET v1/conversations/123 failed: 404 Not Found — {"message":"..."}'
  error.status; // 404
  error.statusText; // "Not Found"
  error.method; // "GET"
  error.url; // "v1/conversations/123"
  error.body; // the parsed Dixa error body
  error.apiMessage; // the message from that body, if it had one
  error.retryAfterMs; // set when Dixa sent Retry-After
  error.code; // axios code, e.g. "ECONNABORTED"
  error.originalError; // the underlying axios error
}
```

Prefer `isDixaApiError(error)` over `error instanceof DixaApiError`: it also
matches errors thrown by a different copy of this package, which happens when a
consumer has both the ESM and the CJS build loaded.

For classification, use the getters rather than comparing statuses by hand:

| Getter           | True when                                                     |
| ---------------- | ------------------------------------------------------------- |
| `isAuthError`    | 401 or 403 — the token is wrong or lacks the scope.           |
| `isNotFound`     | 404.                                                          |
| `isRateLimited`  | 429.                                                          |
| `isServerError`  | 5xx.                                                          |
| `isNetworkError` | No response at all — connection failure, DNS, or timeout.     |
| `isTimeout`      | The request timed out.                                        |
| `isRetryable`    | Retrying could plausibly succeed: no response, 408, 429, 5xx. |

`isRetryable` is what you want when deciding whether to fail a webhook so the
sender redelivers, rather than retrying a 401 forever:

```typescript
try {
  await holdOrdersFor(conversation);
} catch (error) {
  if (isDixaApiError(error) && !error.isRetryable) {
    return new Response("dropped", { status: 200 }); // no point redelivering
  }
  throw error; // let Dixa retry us
}
```

## Retries

429s, 5xx responses and transport failures are retried automatically: twice by
default, honouring `Retry-After` when Dixa sends one (both the seconds and the
HTTP-date form), and otherwise backing off exponentially from 500ms with jitter.

```typescript
const dixa = new Dixa("your-access-token", {
  retry: false, // or a number for the retry count, or:
});

const dixa = new Dixa("your-access-token", {
  retry: {
    retries: 3,
    minDelayMs: 500,
    maxDelayMs: 20_000,
    maxRetryAfterMs: 60_000,
    retryNonIdempotent: false,
    onRetry: ({ attempt, delayMs, error }) =>
      log.warn({ attempt, delayMs, status: error.status }, "retrying Dixa"),
  },
});
```

Two defaults worth knowing:

- **POST is not replayed on a 5xx or a transport failure.** Dixa has no
  idempotency key, so replaying a POST can create a second conversation, note or
  message. Set `retryNonIdempotent: true` to opt in. A 429 _is_ replayed for
  every method, since a rate-limited request was rejected before it was
  processed.
- **A `Retry-After` longer than `maxRetryAfterMs` (60s) is not waited out.** The
  error is thrown with `retryAfterMs` set so a caller with its own deadline — a
  serverless request path, say — can decide what to do.

## Resources Available

### v1

- [x] Agents
- [x] Analytics
- [] BusinessHours
- [] ChatBots
- [x] ContactEndpoints
- [x] Conversations
- [x] CustomAttributes
- [x] EndUsers
- [] Knowledge
- [x] Queues
- [] Ratings
- [x] Tags
- [x] Teams
- [] Templates
- [x] Webhooks

## Development

```bash
npm install
npm test          # vitest, against a mocked axios adapter
npm run typecheck
npm run build     # tsup, emits dist/
```
