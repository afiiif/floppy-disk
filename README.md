# FloppyDisk.ts 💾

A unified state model for **sync & async** data.

If you know [Zustand](https://zustand.docs.pmnd.rs) & [TanStack-Query](https://tanstack.com/query), you already know FloppyDisk(.ts).\
It keeps what works, removes unnecessary complexity, and unifies everything into a simpler API.\
No relearning—just a better experience.

_Smaller bundle. Zero dependencies._

Demo: https://afiiif.github.io/floppy-disk/

**Installation:**

```
npm install floppy-disk
```

## In short, it is:

- **Like Zustand, but has additional capability:**
  - No selector: auto optimize re-render.
  - Store events: `onSubscribe`, `onUnSubscribe`, etc.
  - Easier to set initial state from server
  - Smaller bundle
- **Like TanStack Query, but:**
  - DX is very similar to Zustand → One mental model for sync & async
  - Extremely less bundle size → With almost the same capabilities

## Store (Global State)

A store is a global state container that can be used both **inside and outside** React.\
With FloppyDisk, creating a store is simple:

```tsx
import { createStore } from "floppy-disk/react";

const useLawn = createStore({
  plants: 3,
  zombies: 1,
});
```

Use it inside a component:

```tsx
function MyPlants() {
  const { plants } = useLawn(); // No selectors needed.

  return <div>Plants: {plants}</div>; // Only re-render when plants state changes
}
```

Update the state **anywhere**:

```tsx
const addPlant = () => {
  useLawn.setState(prev => ({ plants: prev.plants + 1 }));
};
```

### Updating State

You can update state using `setState`:

```tsx
const useLawn = createStore({ plants: 3, zombies: 1 });
// Current state: { plants: 3, zombies: 1 }

useLawn.setState({ plants: 5, zombies: 5 });
// Current state: { plants: 5, zombies: 5 }

useLawn.setState({ plants: 7 }); // 👈 Partial update
// Current state: { plants: 7, zombies: 5 }

useLawn.setState(prev => ({ plants: prev.plant + 2 })); // 👈 Using function
// Current state: { plants: 9, zombies: 5 }
```

### Reading State Outside React

Stores are not limited to React. You can access state **anywhere**:

```tsx
const state = useLawn.getState();
console.log(state.plants);
```

### Subscribing to Changes

You can subscribe to state changes:

```tsx
const unsubscribeLawn = useLawn.subscribe((currentState, prevState) => {
  console.log("State changed:", currentState);
});

// Later
unsubscribeLawn(); // when you no longer need it
```

### Transient Updates (No Re-render)

Sometimes you want to listen to changes **without triggering re-renders**.
You can do this by simply subscribing to the store:

```tsx
function MyComponent() {

  useEffect(() => useLawn.subscribe((currentState, prevState) => {
    if (currentState.zombies !== prevState.zombies) {
      console.log("Zombie updated");
      // Do something ...
    }
  }), []);

  ...
}
```

## Store Events

FloppyDisk provides lifecycle events to help you understand when **subscribers are added or removed**, and react accordingly.

Each store exposes the following events:

- `onFirstSubscribe` → triggered right after the first subscriber is added
- `onSubscribe` → triggered after any subscriber is added (including the first)
- `onUnsubscribe` → triggered right after a subscriber is removed
- `onLastUnsubscribe` → triggered after the last subscriber is removed

```tsx
const useLawn = createStore(
  {
    plants: 3,
    zombies: 1,
  },
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

### Use Cases

These events let you control resource lifecycle based on usage.\
You know exactly:
- when something starts being used
- when it's no longer needed


**Perfect for:**
- opening / closing connections
- starting / stopping polling
- initializing expensive resources
- adding / removing window event listeners

### State Changes Event

Sometimes you want to observe state changes **without becoming a subscriber**.

In addition to lifecycle events, FloppyDisk provides `onStateChange` event.
It listens to changes, but does NOT count as a subscriber.
It Acts like a "**spy**" on state updates.

Useful for devtools, logging, or debugging state changes.

```tsx
const useLawn = createStore(
  {
    plants: 3,
    zombies: 1,
  },
  {
    onStateChange: (currentState, prevState) => {
      if (currentState.zombies === 0 && prevState.zombies > 30) {
        toast("🏆 Achievement unlocked! Clear more than 30 zombies at once!");
      }
    }
  },
);
```

## Query & Mutation Store for Async State

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

const myQuery = createQuery(
  myAsyncFn,
  // { staleTime: 5000, revalidateOnFocus: false } <-- optional options
);
```

Use it inside your component:

```tsx
const useMyQuery = myQuery();

function MyComponent() {
  const { data, error } = useMyQuery();

  if (!data && !error) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>{data.foo} {data.bar}</div>;
}
```

### Query State: Two Independent Dimensions

FloppyDisk tracks two things separately:

- Is it running? → `isPending`
- What's the result? → `state`

They are **independent**.

### Keyed Query (Dynamic Params)

You can create parameterized queries:

```tsx
import { createQuery } from "floppy-disk/react";

import { getZombieById, type GetZombieByIdResponse } from "../utils"; // Your own module

type ZombieQueryParam = { id: string };

const zombieQuery = createQuery<GetZombieByIdResponse, ZombieQueryParam>(
  getZombieById,
  // { staleTime: 5000, revalidateOnFocus: false } <-- optional options
);
```

Use it with parameters:

```tsx
function ZombieDetail({ id }) {
  const useZombieQuery = zombieQuery({ id });
  const { data, error } = useZombieQuery();

  if (!data && !error) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>Name: {data.name}, hp: {data.hp}</div>;
}
```

Each unique parameter creates its own cache entry.

### Store Inheritance

Queries in FloppyDisk are built on top of the core store.
This means every query inherits the same capabilities, such as `subscribe`, `getState`, and store events.
It also gets **automatic reactivity** out of the box, so components rerender only when the state they use actually changes.

```tsx
const { data } = useMyQuery();
// ^Only data changes will trigger a re-render

const value = useMyQuery().data?.foo.bar.baz;
// ^Only data.foo.bar.baz changes will trigger a re-render
```

Get state outside React:

```tsx
const myPlantQuery = createQuery<MyPlantResponse>(getMyPlant); // Query without paramerer
const zombieQuery = createQuery<GetZombieByIdResponse, { id: string }>(getZombieById); // Parameterized query

const getMyPlantQueryData = () => myPlantQuery().getState().data;
const getUserQueryData = ({ id }) => zombieQuery({ id }).getState().data;
```

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
type GetPlantParams = {
  cursor?: string; // For pagination
};
type GetPlantsResponse = {
  plants: Plant[];
  meta: { nextCursor: string };
};

const plantsQuery = createQuery<GetPlantsResponse, GetPlantParams>(getPlants, {
  staleTime: Infinity,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
});

function Main() {
  return <Page cursor={undefined} />;
}

function Page({ cursor }: { cursor?: string }) {
  const usePlantsQuery = plantsQuery({ cursor });
  const { state, data, error } = usePlantsQuery();

  if (!data && !error) return <div>Loading...</div>;
  if (error) return <div>Error</div>;

  return (
    <>
      {data.plants.map((plant) => (
        <PlantCard key={plant.id} plant={plant} />
      ))}
      {data.meta.nextCursor && <LoadMore nextCursor={data.meta.nextCursor} />}
    </>
  );
}

function LoadMore({ nextCursor }: { nextCursor?: string }) {
  const [isNextPageRequested, setIsNextPageRequested] = useState(() => {
    const stateOfNextPageQuery = plantsQuery({ cursor: nextCursor }).getState();
    return stateOfNextPageQuery.isPending || stateOfNextPageQuery.isSuccess;
  });

  if (isNextPageRequested) {
    return <Page cursor={nextCursor} />;
  }

  return <DomObserver onReachBottom={() => setIsNextPageRequested(true)} />;
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

### Mutation

Mutations are used to perform write operations—such as creating, updating, or deleting data.

FloppyDisk provides two ways to use mutations:
- Global mutation → shared state across components
- Local mutation → isolated per component

#### Global Mutation

Create a global mutation using `createMutation`:

```tsx
import { createMutation } from "floppy-disk/react";

const useUpdatePlant = createMutation(updatePlant, {
  onSuccess: (data) => {
    console.log("Global success:", data);
  },
});
```

Use it inside any component:

```tsx
function UpdateButton() {
  const { isPending } = useUpdatePlant();

  return (
    <button
      disabled={isPending}
      onClick={() => {
        useUpdatePlant.execute({ id: 1, name: "Sunflower", hp: 300 });
      }}
    >
      Update User
    </button>
  );
}
```

Characteristics:
- Shared across all components
- Single source of truth for mutation state
- Can be triggered from anywhere using `.execute()`
- Useful for global actions (e.g. forms, shared actions)

#### Local Mutation

Create a local mutation using `useMutation`:

```tsx
import { useMutation } from "floppy-disk/react";

function UpdateForm() {
  const [result, { execute }] = useMutation(updateZombie, {
    onSuccess: (data) => {
      console.log("Local success:", data);
    },
  });

  return (
    <div>
      <button
        disabled={result.isPending}
        onClick={() => {
          execute({ id: 27, name: "Gargantuar", hp: 3000 });
        }}
      >
        Submit
      </button>

      {result.isError && <div>Error occurred</div>}
    </div>
  );
}
```

Characteristics:
- Isolated per component instance
- Each usage has its own state
- No shared side effects
- Ideal for component-scoped interactions

#### Execution

Both global and local mutations:

- Execute via `execute(input)`
- Return a Promise that **never throw**.\
  It returns `{ variable: TVariable; data?: TData; error?: TError }` instead.
- Update state automatically (`isPending`, `isSuccess`, `isError`, etc.)

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
 │ isPending: false           │                                      ■│ isPending: false           │
 │ isRevalidating: false      │                                       │ isRevalidating: false      │
 │                            │                  ┌──────────────────▶ │                            │
 │ state: "INITIAL"           │                  │                   ■│ state: "ERROR"             │
 │ isSuccess: false           │                  │                    │ isSuccess: false           │
 │ data: undefined            │                  │                    │ data: undefined            │
 │ dataUpdatedAt: undefined   │                  │                    │ dataUpdatedAt: undefined   │
 │ dataStaleAt: undefined     │                  │                    │ dataStaleAt: undefined     │
 │ isError: false             │                  │                   ■│ isError: true              │
 │ error: undefined           │                  │                   ■│ error: <TError>            │
 │ errorUpdatedAt: undefined  │                  │                   ■│ errorUpdatedAt: <number>   │
 │                            │                  │                    │                            │
 │ willRetryAt: undefined     │                  │                    │ willRetryAt: undefined     │
 │ isRetrying: false          │                  │                   •│ isRetrying: false          │
 │ retryCount: 0              │                  │                   •│ retryCount: 0 (reset)      │
 └─────────────┬──────────────┘                  │                    └────────────────────────────┘
               │                                 │
               │ execute                         │
               ▼                                 │                      waiting retry delay
 ┌────────────────────────────┐                 (N)                   ┌────────────────────────────┐
■│ isPending: true         [ƒ]│                  │                   ■│ isPending: false           │
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
 │ willRetryAt: undefined     │                  │                   ■│ willRetryAt: <number>      │
 │ isRetrying: false          │                  │                    │ isRetrying: false          │
 │ retryCount: 0              │                  │                    │ retryCount: <number>       │
 └─────────────┬──────────────┘                  │                    └─────────────┬──────────────┘
               │                                 │                                  │
               │ success                         │                                  │ retrying
               ▼                                 │                                  ▼
 ┌────────────────────────────┐                  │                    ┌────────────────────────────┐
■│ isPending: false           │                  │                   ■│ isPending: true         [ƒ]│
 │ isRevalidating: false      │                  │            fail    │ isRevalidating: false      │
 │                            │                  └────────────────────┤                            │
■│ state: "SUCCESS"           │                                       │ state: "INITIAL"           │
■│ isSuccess: true            │                                       │ isSuccess: false           │
■│ data: <TData>              │                                       │ data: undefined            │
■│ dataUpdatedAt: <number>    │                                       │ dataUpdatedAt: undefined   │
■│ dataStaleAt: <number>      │                                       │ dataStaleAt: undefined     │
 │ isError: false             │                                       │ isError: false             │
 │ error: undefined           │                                       │ error: undefined           │
 │ errorUpdatedAt: undefined  │                            success    │ errorUpdatedAt: undefined  │
 │                            │ ◀─────────────────────────────────────┤                            │
 │ willRetryAt: undefined     │                                      ■│ willRetryAt: undefined     │
•│ isRetrying: false          │                                      ■│ isRetrying: true           │
•│ retryCount: 0 (reset)      │                                      ■│ retryCount: <number> (+1)  │
 └────────────────────────────┘                                       └────────────────────────────┘
```

And then after success:

```
   success                                                              failed, won't retry
 ┌────────────────────────────┐                                       ┌─────────────────────────────────────────┐
 │ isPending: false           │                                      ■│ isPending: false                        │
 │ isRevalidating: false      │                                      ■│ isRevalidating: false                   │
 │                            │                  ┌──────────────────▶ │                                         │
 │ state: "SUCCESS"           │                  │                   ■│ state: "SUCCESS_BUT_REVALIDATION_ERROR" │
 │ isSuccess: true            │                  │                    │ isSuccess: true                         │
 │ data: <TData>              │                  │                    │ data: <TData>                           │
 │ dataUpdatedAt: <number>    │                  │                    │ dataUpdatedAt: <number>                 │
 │ dataStaleAt: <number>      │                  │                    │ dataStaleAt: <number>                   │
 │ isError: false             │                  │                    │ isError: false                          │
 │ error: undefined           │                  │                   ■│ error: <TError>                         │
 │ errorUpdatedAt: undefined  │                  │                   ■│ errorUpdatedAt: <number>                │
 │                            │                  │                    │                                         │
 │ willRetryAt: undefined     │                  │                    │ willRetryAt: undefined                  │
 │ isRetrying: false          │                  │                   •│ isRetrying: false                       │
 │ retryCount: 0              │                  │                   •│ retryCount: 0 (reset)                   │
 └─────────────┬──────────────┘                  │                    └─────────────────────────────────────────┘
               │                                 │
               │ revalidate                      │
               ▼                                 │                      waiting retry delay
 ┌────────────────────────────┐                 (N)                   ┌────────────────────────────┐
■│ isPending: true         [ƒ]│                  │                   ■│ isPending: false           │
■│ isRevalidating: true       │    fail          │                   ■│ isRevalidating: false      │
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
 │ willRetryAt: undefined     │                  │                   ■│ willRetryAt: <number>      │
 │ isRetrying: false          │                  │                    │ isRetrying: false          │
 │ retryCount: 0              │                  │                    │ retryCount: <number>       │
 └─────────────┬──────────────┘                  │                    └─────────────┬──────────────┘
               │                                 │                                  │
               │ success                         │                                  │ retrying
               ▼                                 │                                  ▼
 ┌────────────────────────────┐                  │                    ┌────────────────────────────┐
■│ isPending: false           │                  │                   ■│ isPending: true         [ƒ]│
■│ isRevalidating: false      │                  │            fail   ■│ isRevalidating: true       │
 │                            │                  └────────────────────┤                            │
 │ state: "SUCCESS"           │                                       │ state: "SUCCESS"           │
 │ isSuccess: true            │                                       │ isSuccess: true            │
■│ data: <TData>              │                                       │ data: <TData>              │
■│ dataUpdatedAt: <number>    │                                       │ dataUpdatedAt: <number>    │
■│ dataStaleAt: <number>      │                                       │ dataStaleAt: <number>      │
 │ isError: false             │                                       │ isError: false             │
 │ error: undefined           │                                       │ error: undefined           │
 │ errorUpdatedAt: undefined  │                            success    │ errorUpdatedAt: undefined  │
 │                            │ ◀─────────────────────────────────────┤                            │
 │ willRetryAt: undefined     │                                      ■│ willRetryAt: undefined     │
•│ isRetrying: false          │                                      ■│ isRetrying: true           │
•│ retryCount: 0 (reset)      │                                      ■│ retryCount: <number> (+1)  │
 └────────────────────────────┘                                       └────────────────────────────┘
```
