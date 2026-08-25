# Changelog

## 2.0.0

Bug-fix release for a batch of problems found by a consumer reading the 1.x
bundle. Two of them change runtime behaviour, hence the major.

### Breaking

#### Reads resolve to the payload, not the `{ data }` envelope

Dixa replies `{ "data": ..., "meta": ... }`. `paginate` unwrapped that, but
`get`/`post`/`put`/`patch`/`delete` returned the raw body, so
`conversations.get(id)` resolved to `{ data: Conversation }` at runtime while
typed `Promise<Conversation>`. Every field read `undefined`. This held for every
`get`/`create`/`update`/`patch` on every resource.

Now the envelope is unwrapped, so the types are true.

```diff
- const { data: conversation } = await dixa.v1.conversations.get(id);
+ const conversation = await dixa.v1.conversations.get(id);
```

If you wrote a helper to unwrap this, delete it. If it accepts both shapes
(`body.data ?? body`), it keeps working either way.

Unwrapping is conservative: a body is only unwrapped when it has a `data` key and
nothing outside `{ data, meta }`. An endpoint that replies without an envelope,
or a resource with its own `data` field, is passed through untouched. A 204 or an
empty body now resolves to `undefined` rather than `""`.

#### `DixaApiError`'s second constructor argument is a context object

Only relevant if you construct the error yourself; catching it is unaffected.

```diff
- new DixaApiError("Request failed", originalError)
+ new DixaApiError("Request failed", { originalError })
```

#### Return types corrected

`agents.delete` and `queues.remove` were typed `Promise<string>` for what is a
204 with no body. Both are now `Promise<void>`.

#### Requests now time out

There was no timeout at all, so a hung request hung the caller forever. The
default is now 30s. Pass `timeout: 0` for the old behaviour.

### Fixed

- **Errors carry the HTTP status.** Every failure used to be
  `new DixaApiError("Request failed", err)`, so telling a 401 from a 404 from a
  429 meant reaching into `err.originalError.response.status`, which was not in
  the public types — and `DixaApiError` was not exported at all, so `instanceof`
  was impossible. It now carries `status`, `statusText`, `method`, `url`, the
  parsed `body`, `code` and `retryAfterMs`, with classification getters
  (`isAuthError`, `isNotFound`, `isRateLimited`, `isServerError`,
  `isNetworkError`, `isTimeout`, `isRetryable`) and `apiMessage`. Messages read
  `Dixa GET v1/conversations/123 failed: 404 Not Found — {...}` instead of
  `Request failed`. `originalError` is kept.
- **`DixaApiError` and `isDixaApiError` are exported**, along with `DixaClient`.
  `isDixaApiError` matches on a `Symbol.for` brand, so it works even when both
  the ESM and CJS build are loaded.
- **Four methods can be awaited again.** `webhooks.delete`, `teams.delete`,
  `teams.removeMembers` and `conversations.untag` called the client without
  returning it, so they resolved with `undefined` before the request settled and
  the dropped rejection became an unhandled promise rejection. Swept every
  resource; these four were the only cases, and a test now guards against a
  fifth.
- **DELETE request bodies are sent.** `queues.remove(queueId, body)` and
  `teams.removeMembers(teamId, body)` accepted a body and never sent it — axios
  needs `config.data` — so removing queue members or team agents could not work.
- **Pagination no longer fights its own cursor.** `paginate` re-sent the original
  query params on every page while also following `meta.next`, which already
  carries the cursor. The query is now sent with the first request only. A
  non-array `data` raises a clear `DixaApiError` instead of a confusing
  `TypeError`, and a repeated cursor stops the loop instead of spinning.
- **Nothing is written to the host console.** The `console.error("API Error:", x)`
  inside the client is gone; pass `logger` to opt into diagnostics.

### Added

- **Retries.** 429s, 5xx and transport failures are retried twice by default,
  honouring `Retry-After` (seconds and HTTP-date) and otherwise backing off
  exponentially from 500ms with jitter. Configure or disable with
  `new Dixa(token, { retry })`. POST is not replayed on 5xx or transport
  failures by default, since Dixa has no idempotency key; a 429 is replayed for
  every method. A `Retry-After` beyond `maxRetryAfterMs` (60s) is not waited out
  — the error is thrown with `retryAfterMs` set. Brings this client in line with
  `@chemicalluck/cin7-core-api-node` and `@chemicalluck/recharge-api-node`.
- **Client options**: `timeout`, `headers`, `retry`, `logger` and `adapter`, as
  `new Dixa(token, options)` or `new DixaClient(token, options)`. The old
  `new DixaClient(token, baseURL)` string form still works.
- **A test suite** (`npm test`), running against a mocked axios adapter, plus
  `npm run typecheck`.

### Unchanged

`Dixa` and `dixa.v1.<resource>.<method>` are otherwise as they were. No new
runtime dependency.

## 1.1.0

- Dependency updates.

## 1.0.1

- Initial published release.
