# FloppyDisk.ts 💾

A unified state model for **sync & async** data.

If you know [Zustand](https://zustand.docs.pmnd.rs) & [TanStack-Query](https://tanstack.com/query), you already know FloppyDisk.\
It keeps what works, removes unnecessary complexity, and unifies everything into a simpler API.\
No relearning—just a better experience.

_Smaller bundle. Zero dependencies._

Demo: https://afiiif.github.io/floppy-disk/

**Installation:**

```
npm install floppy-disk
```

## Global Store

Here's how to create and use a store:

```tsx
import { createStore } from "floppy-disk/react";

const useDigimon = createStore({
  age: 7,
  level: "Rookie",
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
      <button
        onClick={() => {
          // You can setState directly
          useDigimon.setState((prev) => ({ age: prev.age + 1 }));
        }}
      >
        Increase digimon's age
      </button>

      <button onClick={evolve}>Evolve</button>
    </>
  );
}

// You can create a custom actions
const evolve = () => {
  const { level } = useDigimon.getState();

  const order = ["In-Training", "Rookie", "Champion", "Ultimate"];
  const nextLevel = order[order.indexOf(level) + 1];

  if (!nextLevel) return console.warn("Already at ultimate level");

  useDigimon.setState({ level: nextLevel });
};
```

### Store Subscription

At its core, FloppyDisk is a **pub-sub store**.

You can subscribe manually:

```tsx
const unsubscribe = useMyStore.subscribe((state, prev) => {
  console.log("New state:", state);
});

// Later
unsubscribe();
```

FloppyDisk provides lifecycle hooks tied to subscription count.

```tsx
const useTowerDefense = createStore(
  { archers: 3, mages: 1, barracks: 2, artillery: 1 },
  {
    onFirstSubscribe: () => {
      console.log("First subscriber! We’re officially popular 🎉");
    },
    onSubscribe: () => {
      console.log("New subscriber joined. Welcome aboard 🫡");
    },
    onUnsubscribe: () => {
      console.log("Subscriber left... was it something I said? 😭");
    },
    onLastUnsubscribe: () => {
      console.log("Everyone left. Guess I’ll just exist quietly now...");
    },
  },
);
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
const useDate = create(new Date(2021, 01, 11));

const useCounter = create((set) => ({
  value: 1,
  increment: () => set((prev) => ({ value: prev.value + 1 })),
}));
```

FloppyDisk equivalents:

```tsx
const useDate = createStore({ value: new Date(2021, 01, 11) });

const useCounter = createStore({ value: 1 });
const increment = () => useCounter.setState((prev) => ({ value: prev.value + 1 }));
// Unlike Zustand, defining actions inside the store is **discouraged** in FloppyDisk.
// This improves tree-shakeability and keeps your store minimal.

// However, it's still possible to mix actions with the state if you understand how closures work:
const useCounterAlt = createStore({
  value: 1,
  increment: () => useCounterAlt.setState((prev) => ({ value: prev.value + 1 })),
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
import { createQuery } from "floppy-disk/react";

const myCoolQuery = createQuery(
  myAsyncFn,
  // { staleTime: 5000, revalidateOnFocus: false } <-- optional options
);

const useMyCoolQuery = myCoolQuery();

// Use it inside your component:

function MyComponent() {
  const query = useMyCoolQuery();
  if (query.state === "INITIAL") return <div>Loading...</div>;
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
import { getUserById, type GetUserByIdResponse } from "../utils";

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
  if (query.state === "INITIAL") return <div>Loading...</div>;
  if (query.error) return <div>Error: {query.error.message}</div>;
  return <div>{JSON.stringify(query.data)}</div>;
}
```

Each unique parameter creates its own cache entry.

### Infinite Query

FloppyDisk does **not provide** a dedicated "infinite query" API.\
Instead, it embraces a simpler and more flexible approach:

> Infinite queries are just **composition** + **recursion**.

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

const postsQuery = createQuery<GetPostsResponse, GetPostParams>(getPosts, {
  staleTime: Infinity,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
});

function Main() {
  return <Page cursor={undefined} />;
}

function Page({ cursor }: { cursor?: string }) {
  const usePostsQuery = postsQuery({ cursor });
  const { state, data, error } = usePostsQuery();

  if (state === "INITIAL") return <div>Loading...</div>;
  if (error) return <div>Error</div>;

  return (
    <>
      {data.posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
      {data.meta.nextCursor && <LoadMore nextCursor={data.meta.nextCursor} />}
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

  return <BottomObserver onReachBottom={() => setIsNextPageRequested(true)} />;
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

Examples for using stores and queries in SSR with isolated data (no shared state between users).

### Initialize Store State from Server

```tsx
const useCountStore = createStore({ count: 0 });

function Page({ initialCount }) {
  const { count } = useCountStore({
    initialState: { count: initialCount }, // e.g. 3
  });

  return <>count is {count}</>; // Output: count is 3
}
```

### Initialize Query Data from Server

```tsx
async function MyServerComponent() {
  const data = await getData(); // e.g. { count: 3 }
  return <MyClientComponent initialData={data} />;
}

const myQuery = createQuery(getData);
const useMyQuery = myQuery();

function MyClientComponent({ initialData }) {
  const { data } = useMyQuery({
    initialData: initialData,
    // initialDataIsStale: true <-- Optional, default to false (no immediate revalidation)
  });

  return <>count is {data.count}</>; // Output: count is 3
}
```

## Query State Machine

This is how the query state transition flow looks like:

```
   initial                                                              failed, won't retry
 ┌────────────────────────────┐                                       ┌────────────────────────────┐
 │ isPending: false           │                                      Δ│ isPending: false           │
 │ isRevalidating: false      │                                       │ isRevalidating: false      │
 │                            │                  ┌──────────────────▶ │                            │
 │ state: "INITIAL"           │                  │                   Δ│ state: "ERROR"             │
 │ isSuccess: false           │                  │                    │ isSuccess: false           │
 │ data: undefined            │                  │                    │ data: undefined            │
 │ dataUpdatedAt: undefined   │                  │                    │ dataUpdatedAt: undefined   │
 │ dataStaleAt: undefined     │                  │                    │ dataStaleAt: undefined     │
 │ isError: false             │                  │                   Δ│ isError: true              │
 │ error: undefined           │                  │                   Δ│ error: <TError>            │
 │ errorUpdatedAt: undefined  │                  │                   Δ│ errorUpdatedAt: <number>   │
 │                            │                  │                    │                            │
 │ willRetryAt: undefined     │                  │                    │ willRetryAt: undefined     │
 │ isRetrying: false          │                  │                   •│ isRetrying: false          │
 │ retryCount: 0              │                  │                   •│ retryCount: 0 (reset)      │
 └─────────────┬──────────────┘                  │                    └────────────────────────────┘
               │                                 │
               │ execute                         │
               ▼                                 │                      waiting retry delay
 ┌────────────────────────────┐                 (N)                   ┌────────────────────────────┐
Δ│ isPending: true         [ƒ]│                  │                   Δ│ isPending: false           │
 │ isRevalidating: false      │    fail          │                    │ isRevalidating: false      │
 │                            ├──────────▶ Should retry? ────(Y)────▶ │                            │
 │ state: "INITIAL"           │                  ▲                    │ state: "INITIAL"           │
 │ isSuccess: false           │                  │                    │ isSuccess: false           │
 │ data: undefined            │                  │                    │ data: undefined            │
 │ dataUpdatedAt: undefined   │                  │                    │ dataUpdatedAt: undefined   │
 │ dataStaleAt: undefined     │                  │                    │ dataStaleAt: undefined     │
 │ isError: false             │                  │                    │ isError: false             │
 │ error: undefined           │                  │                    │ error: undefined           │
 │ errorUpdatedAt: undefined  │                  │                    │ errorUpdatedAt: undefined  │
 │                            │                  │                    │                            │
 │ willRetryAt: undefined     │                  │                   Δ│ willRetryAt: <number>      │
 │ isRetrying: false          │                  │                    │ isRetrying: false          │
 │ retryCount: 0              │                  │                    │ retryCount: <number>       │
 └─────────────┬──────────────┘                  │                    └─────────────┬──────────────┘
               │                                 │                                  │
               │ success                         │                                  │ retrying
               ▼                                 │                                  ▼
 ┌────────────────────────────┐                  │                    ┌────────────────────────────┐
Δ│ isPending: false           │                  │                   Δ│ isPending: true         [ƒ]│
 │ isRevalidating: false      │                  │            fail    │ isRevalidating: false      │
 │                            │                  └────────────────────┤                            │
Δ│ state: "SUCCESS"           │                                       │ state: "INITIAL"           │
Δ│ isSuccess: true            │                                       │ isSuccess: false           │
Δ│ data: <TData>              │                                       │ data: undefined            │
Δ│ dataUpdatedAt: <number>    │                                       │ dataUpdatedAt: undefined   │
Δ│ dataStaleAt: <number>      │                                       │ dataStaleAt: undefined     │
 │ isError: false             │                                       │ isError: false             │
 │ error: undefined           │                                       │ error: undefined           │
 │ errorUpdatedAt: undefined  │                            success    │ errorUpdatedAt: undefined  │
 │                            │ ◀─────────────────────────────────────┤                            │
 │ willRetryAt: undefined     │                                      Δ│ willRetryAt: undefined     │
•│ isRetrying: false          │                                      Δ│ isRetrying: true           │
•│ retryCount: 0 (reset)      │                                      Δ│ retryCount: <number> (+1)  │
 └────────────────────────────┘                                       └────────────────────────────┘
```

And then after success:

```
   success                                                              failed, won't retry
 ┌────────────────────────────┐                                       ┌─────────────────────────────────────────┐
 │ isPending: false           │                                      Δ│ isPending: false                        │
 │ isRevalidating: false      │                                      Δ│ isRevalidating: false                   │
 │                            │                  ┌──────────────────▶ │                                         │
 │ state: "SUCCESS"           │                  │                   Δ│ state: "SUCCESS_BUT_REVALIDATION_ERROR" │
 │ isSuccess: true            │                  │                    │ isSuccess: true                         │
 │ data: <TData>              │                  │                    │ data: <TData>                           │
 │ dataUpdatedAt: <number>    │                  │                    │ dataUpdatedAt: <number>                 │
 │ dataStaleAt: <number>      │                  │                    │ dataStaleAt: <number>                   │
 │ isError: false             │                  │                    │ isError: false                          │
 │ error: undefined           │                  │                   Δ│ error: <TError>                         │
 │ errorUpdatedAt: undefined  │                  │                   Δ│ errorUpdatedAt: <number>                │
 │                            │                  │                    │                                         │
 │ willRetryAt: undefined     │                  │                    │ willRetryAt: undefined                  │
 │ isRetrying: false          │                  │                   •│ isRetrying: false                       │
 │ retryCount: 0              │                  │                   •│ retryCount: 0 (reset)                   │
 └─────────────┬──────────────┘                  │                    └─────────────────────────────────────────┘
               │                                 │
               │ revalidate                      │
               ▼                                 │                      waiting retry delay
 ┌────────────────────────────┐                 (N)                   ┌────────────────────────────┐
Δ│ isPending: true         [ƒ]│                  │                   Δ│ isPending: false           │
Δ│ isRevalidating: true       │    fail          │                   Δ│ isRevalidating: false      │
 │                            ├──────────▶ Should retry? ────(Y)────▶ │                            │
 │ state: "SUCCESS"           │                  ▲                    │ state: "SUCCESS"           │
 │ isSuccess: true            │                  │                    │ isSuccess: true            │
 │ data: <TData>              │                  │                    │ data: <TData>              │
 │ dataUpdatedAt: <number>    │                  │                    │ dataUpdatedAt: <number>    │
 │ dataStaleAt: <number>      │                  │                    │ dataStaleAt: <number>      │
 │ isError: false             │                  │                    │ isError: false             │
 │ error: undefined           │                  │                    │ error: undefined           │
 │ errorUpdatedAt: undefined  │                  │                    │ errorUpdatedAt: undefined  │
 │                            │                  │                    │                            │
 │ willRetryAt: undefined     │                  │                   Δ│ willRetryAt: <number>      │
 │ isRetrying: false          │                  │                    │ isRetrying: false          │
 │ retryCount: 0              │                  │                    │ retryCount: <number>       │
 └─────────────┬──────────────┘                  │                    └─────────────┬──────────────┘
               │                                 │                                  │
               │ success                         │                                  │ retrying
               ▼                                 │                                  ▼
 ┌────────────────────────────┐                  │                    ┌────────────────────────────┐
Δ│ isPending: false           │                  │                   Δ│ isPending: true         [ƒ]│
Δ│ isRevalidating: false      │                  │            fail   Δ│ isRevalidating: true       │
 │                            │                  └────────────────────┤                            │
 │ state: "SUCCESS"           │                                       │ state: "SUCCESS"           │
 │ isSuccess: true            │                                       │ isSuccess: true            │
Δ│ data: <TData>              │                                       │ data: <TData>              │
Δ│ dataUpdatedAt: <number>    │                                       │ dataUpdatedAt: <number>    │
Δ│ dataStaleAt: <number>      │                                       │ dataStaleAt: <number>      │
 │ isError: false             │                                       │ isError: false             │
 │ error: undefined           │                                       │ error: undefined           │
 │ errorUpdatedAt: undefined  │                            success    │ errorUpdatedAt: undefined  │
 │                            │ ◀─────────────────────────────────────┤                            │
 │ willRetryAt: undefined     │                                      Δ│ willRetryAt: undefined     │
•│ isRetrying: false          │                                      Δ│ isRetrying: true           │
•│ retryCount: 0 (reset)      │                                      Δ│ retryCount: <number> (+1)  │
 └────────────────────────────┘                                       └────────────────────────────┘
```
