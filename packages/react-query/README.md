# @eventiq/react-query

TanStack Query bridge for `@eventiq/core`. Maps engine steps to query fetches. eventiq handles ordering, React Query handles caching and retries.

## Install

```bash
npm install @eventiq/core @eventiq/react-query @tanstack/react-query
```

## Usage (hook)

```tsx
import { EventiqEngine } from '@eventiq/core';
import { useEventiqQueries } from '@eventiq/react-query';

const engine = new EventiqEngine();

function ProfilePage() {
  useEventiqQueries(engine, [
    {
      name: 'fetch-user',
      queryKey: ['user'],
      queryFn: () => api.getUser(),
    },
    {
      name: 'fetch-posts',
      queryKey: ['posts'],
      queryFn: () => api.getPosts(),
      onError: 'skip', // mark as SKIPPED instead of FAILURE
    },
  ]);

  // Submit a plan; steps are auto-fetched when they start
  useEffect(() => {
    engine.submit({
      name: 'profile',
      steps: [
        { name: 'fetch-user', needs: [] },
        { name: 'fetch-posts', needs: ['fetch-user'] },
      ],
    });
  }, []);
}
```

When a step starts, its `queryFn` is called via `queryClient.fetchQuery()`. On resolve, the step completes with `SUCCESS`. On reject, it completes with `FAILURE` (or `SKIPPED` if configured).

## Usage (imperative)

For use outside of React components:

```ts
import { bindEventiqToQueryClient } from '@eventiq/react-query';

const cleanup = bindEventiqToQueryClient(engine, queryClient, [
  { name: 'fetch-user', queryKey: ['user'], queryFn: () => api.getUser() },
  { name: 'fetch-posts', queryKey: ['posts'], queryFn: () => api.getPosts() },
]);

engine.submit(plan);

// Later:
cleanup();
```

This variant also auto-starts ready steps.

## Why combine them?

| Concern | Handled by |
|---------|-----------|
| Execution order | eventiq (DAG dependencies) |
| Caching | React Query (stale-while-revalidate) |
| Retries | React Query (configurable per query) |
| Deduplication | React Query (same queryKey = same request) |
| Step lifecycle & progress UI | eventiq (BLOCKED → READY → RUNNING → COMPLETE) |

## License

MIT
