# FloppyDisk.ts 💾

A lightweight, simple, and powerful state management library.

This library was highly-inspired by [Zustand](https://www.npmjs.com/package/zustand) and [TanStack-Query](https://tanstack.com/query), they're awesome state manager.
FloppyDisk provides a very similar developer experience (DX), while introducing additional features and a smaller bundle size.

Comparison: https://github.com/afiiif/floppy-disk/tree/beta/comparison

Demo: https://afiiif.github.io/floppy-disk/

**Installation:**

```
npm install floppy-disk
```

## Global Store

Here's how to create and use a store:

```tsx
import { createStore } from 'floppy-disk/react';

const useDigimon = createStore({
  age: 3,
  level: 'Rookie' as 'In-Training' | 'Rookie' | 'Champion' | 'Ultimate',
});
```

You can use the store both inside and outside of React components.

```tsx
function MyDigimon() {
  const { age } = useDigimon();
  return <div>Digimon age: {age}</div>;
  // This component will only re-render when `age` changes.
  // Changes to `level` will NOT trigger a re-render.
}

function Control() {
  return (
    <>
      <button onClick={() => {
        // You can setState directly
        useDigimon.setState(prev => ({ age: prev.age + 1 }));
      }}>
        Increase digimon's age
      </button>

      <button onClick={evolve}>Evolve</button>
    </>
  );
}

// You can create a custom actions
const evolve = (nextLevel: 'Rookie' | 'Champion' | 'Ultimate') => {
  const { age, level } = useDigimon.getState();

  const minAge = {
    Rookie: 3,
    Champion: 6,
    Ultimate: 11,
  };

  if (age < minAge[nextLevel]) {
    return console.warn('Not enough age');
  }

  useDigimon.setState({ level: nextLevel });
};
```

### Differences from Zustand

If you're coming from Zustand, this should feel very familiar.\
Key differences:

1. **No Selectors Needed**\
   You don't need selectors when using hooks.
   FloppyDisk automatically tracks which parts of the state are used and optimizes re-renders accordingly.
2. **Object-Only Store Initialization**\
   In FloppyDisk, stores **must** be initialized with an object. Primitive values or function initializers are not allowed.

Zustand examples:

```tsx
const useExample1 = create(123);

const useExample2 = create(set => ({
  value: 1,
  inc: () => set(prev => ({ value: prev.value + 1 })),
}));
```

FloppyDisk equivalents:

```tsx
const useExample1 = createStore({ value: 123 });

// Unlike Zustand, defining actions inside the store is **discouraged** in FloppyDisk.
// This improves tree-shakeability and keeps your store minimal.
const useExample2 = createStore({ value: 1 });
const inc = () => useExample2.setState(prev => ({ value: prev.value + 1 }));

// However, it's still possible if you understand how closures work:
const useExample2Alt = createStore({
  value: 1,
  inc: () => useExample2Alt.setState(prev => ({ value: prev.value + 1 })),
});
```

## Async State (Query & Mutation)

FloppyDisk also provides a powerful async state layer, inspired by [TanStack-Query](https://tanstack.com/query) but with a simpler API.

It is agnostic to the type of async operation,
it works with any Promise-based operation—whether it's a network request, local computation, storage access, or something else.

Because of that, we intentionally avoid terms like "fetch" or "refetch".\
Instead, we use:

- **execute** → run the async operation (same as "fetch" in TanStack-Query)
- **revalidate** → re-run while keeping existing data (same as "refetch" in TanStack-Query)

### Query vs Mutation

<details>

<summary>Query → Read Operations</summary>

Queries are designed for reading data.\
They assume:

- no side effects
- no data mutation
- safe to run multiple times

Because of this, queries come with helpful defaults:

- ✅ Retry mechanism (for transient failures)
- ✅ Revalidation (keep data fresh automatically)
- ✅ Caching & staleness control

Use queries when:

- fetching data
- reading from storage
- running idempotent async logic

</details>

<details>

<summary>Mutation → Write Operations</summary>

Mutations are designed for changing data.\
Examples:

- insert
- update
- delete
- triggering side effects

Because mutations are **not safe to repeat blindly**, FloppyDisk does **not** include:

- ❌ automatic retry
- ❌ automatic revalidation
- ❌ implicit re-execution

This is intentional.\
Mutations should be explicit and controlled, not automatic.

If you need retry mechanism, then you can always add it manually.

</details>

### Single Query

Create a query using `createQuery`:

```tsx
import { createQuery } from 'floppy-disk/react';

const myCoolQuery = createQuery(
  myAsyncFn,
  // { staleTime: 5000, revalidateOnFocus: false } <-- optional options
);

const useMyCoolQuery = myCoolQuery();

// Use it inside your component:

function MyComponent() {
  const query = useMyCoolQuery();
  if (query.state === 'INITIAL') return <div>Loading...</div>;
  if (query.error) return <div>Error: {query.error.message}</div>;
  return <div>{JSON.stringify(query.data)}</div>;
}
```

### Query State: Two Independent Dimensions

FloppyDisk tracks two things separately:

- Is it running? → `isPending`\
  (value: `boolean`)
- What's the result? → `state`\
  (value: `INITIAL | 'SUCCESS' | 'ERROR' | 'SUCCESS_BUT_REVALIDATION_ERROR'`)

They are **independent**.

### Automatic Re-render Optimization

Just like the global store, FloppyDisk tracks usage automatically:

```tsx
const { data } = useMyQuery();
// ^Only data changes will trigger a re-render

const value = useMyQuery().data?.foo.bar.baz;
// ^Only data.foo.bar.baz changes will trigger a re-render
```

### Keyed Query (Dynamic Params)

You can create parameterized queries:

```tsx
import { getUserById, type GetUserByIdResponse } from '../utils';

type MyQueryParam = { id: string };

const userQuery = createQuery<GetUserByIdResponse, MyQueryParam>(
  getUserById,
  // { staleTime: 5000, revalidateOnFocus: false } <-- optional options
);
```

Use it with parameters:

```tsx
function UserDetail({ id }) {
  const useUserQuery = userQuery({ id: 1 });
  const query = useUserQuery();
  if (query.state === 'INITIAL') return <div>Loading...</div>;
  if (query.error) return <div>Error: {query.error.message}</div>;
  return <div>{JSON.stringify(query.data)}</div>;
}
```

Each unique parameter creates its own cache entry.

### Infinite Query

FloppyDisk does **not provide** a dedicated "infinite query" API.\
Instead, it embraces a simpler and more flexible approach:

> _Infinite queries are just **composition** + **recursion**._

Why? Because async state is already powerful enough:

- keyed queries handle parameters
- components handle composition
- recursion handles pagination

No special abstraction needed.

Here is the example on how to implement infinite query properly:

```tsx
type GetPostParams = {
  cursor?: string; // For pagination
};
type GetPostsResponse = {
  posts: Post[];
  meta: { nextCursor: string };
};

const postsQuery = createQuery<GetPostsResponse, GetPostParams>(
  getPosts,
  {
    staleTime: Infinity,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  },
);

function Main() {
  return <Page cursor={undefined} />;
}

function Page({ cursor }: { cursor?: string }) {
  const usePostsQuery = postsQuery({ cursor });
  const { state, data, error } = usePostsQuery();

  if (state === 'INITIAL') return <div>Loading...</div>;
  if (error) return <div>Error</div>;

  return (
    <>
      {data.posts.map(post => (
        <PostCard key={post.id} post={post} />
      ))}
      {data.meta.nextCursor && (
        <LoadMore nextCursor={data.meta.nextCursor} />
      )}
    </>
  );
}

function LoadMore({ nextCursor }: { nextCursor?: string }) {
  const [isNextPageRequested, setIsNextPageRequested] = useState(() => {
    const stateOfNextPageQuery = postsQuery({ cursor: nextCursor }).getState();
    return stateOfNextPageQuery.isPending || stateOfNextPageQuery.isSuccess;
  });

  if (isNextPageRequested) {
    return <Page cursor={nextCursor} />;
  }

  return (
    <ReachingBottomObserver
      onReachBottom={() => setIsNextPageRequested(true)}
    />
  );
}
```

When implementing infinite queries, it is **highly recommended to disable automatic revalidation**.

Why?\
In an infinite list, users may scroll through many pages ("_doom-scrolling_").\
If revalidation is triggered:

- All previously loaded pages may re-execute
- Content at the top may change without the user noticing
- Layout shifts can occur unexpectedly

This leads to a **confusing and unstable user experience**.\
Revalidating dozens of previously viewed pages rarely provides value to the user.

## SSR Guidance

FloppyDisk is designed primarily for **client-side [sync/async] state**.

If your data is already fetched on the server (e.g. via SSR/ISR, Server Components, or Server Actions), then:

> **You most likely don't need this library.**

This is the same philosophy as TanStack Query. 💡

In many cases, developers mix SSR/ISR with client-side state because they want:

1. Data to be rendered into HTML on the server
2. The ability to **revalidate it on the client**

A common (but inefficient) approach is:

- fetch on the server
- hydrate it into a client-side cache
- then revalidate using a query library

While this works, it introduces additional complexity.

Instead, we encourage a simpler approach:

> If your data is fetched on the server, revalidate it using **your framework's built-in mechanism** (e.g. Next.js route revalidation).

Because of this philosophy, FloppyDisk **does not support** hydrating server-fetched data into the client store.

This keeps the mental model clean:

- server data → handled by the framework
- client async state → handled by FloppyDisk
