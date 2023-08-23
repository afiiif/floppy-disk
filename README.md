# Floppy Disk 💾

A lightweight, simple, and powerful state management library.

This library was highly-inspired by [Zustand](https://www.npmjs.com/package/zustand) and [React-Query](https://tanstack.com/query). Both are awesome state manager, but I want to have something like that with **more power** and **less bundle size**.

**Bundle Size Comparison:**

```js
import { create } from 'zustand'; // 3.3 kB (gzipped: 1.5 kB)

import { createStore } from 'floppy-disk'; // 1.3 kB (gzipped: 702 B) 🎉

import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useInfiniteQuery,
  useMutation,
} from '@tanstack/react-query'; // 41 kB (gzipped: 11 kB)

import { createQuery, createMutation } from 'floppy-disk'; // 7.5 kB (gzipped: 2.6 kB) 🎉
```

- Using Zustand & React-Query: https://demo-zustand-react-query.vercel.app/  
  👉 Total: **309.22 kB** ~ gzipped 97.66 kB
- Using Floppy Disk: https://demo-floppy-disk.vercel.app/  
  👉 Total: **282.86 kB** ~ gzipped 90.46 kB

## Table of Contents

- [Store](#store)
  - [Basic Concept](#basic-concept)
  - [Advanced Concept](#advanced-concept)
- [Stores](#stores)
- [Query \& Mutation](#query--mutation)
  - [Single Query](#single-query)
  - [Single Query with Params](#single-query-with-params)
  - [Paginated Query or Infinite Query](#paginated-query-or-infinite-query)
  - [Mutation](#mutation)
- [Important Notes](#important-notes)

## Store

### Basic Concept

Create a store.

```js
import { createStore } from 'floppy-disk';

const useCatStore = createStore(({ set }) => ({
  age: 0,
  isSleeping: false,
  increaseAge: () => set((state) => ({ age: state.age + 1 })),
  reset: () => set({ age: 0, isSleeping: false }),
}));
```

Use the hook anywhere, no providers are needed.

```jsx
function Cat() {
  const { age } = useCatStore((state) => [state.age]);
  return <div>Cat's age: {age}</div>;
}

function Control() {
  const { increaseAge } = useCatStore((state) => [state.increaseAge]);
  return <button onClick={increaseAge}>Increase cat's age</button>;
}
```

Control the reactivity. The concept is same as useEffect dependency array.

```jsx
function Cat() {
  const { age, isSleeping } = useCatStore();
  // Will re-render every state change    ^
  return <div>...</div>;
}

function Cat() {
  const { age, isSleeping } = useCatStore((state) => [state.isSleeping]);
  // Will only re-render when isSleeping is updated   ^
  // Update on age won't cause re-render this component
  return <div>...</div>;
}

function Cat() {
  const { age, isSleeping } = useCatStore((state) => [state.age, state.isSleeping]);
  // Will re-render when age or isSleeping is updated ^
  return <div>...</div>;
}

function Cat() {
  const { age, isSleeping } = useCatStore((state) => [state.age > 3]);
  // Will only re-render when (age>3) is updated
  return <div>...</div>;
}
```

Reading/writing state and reacting to changes outside of components.

```js
const alertCatAge = () => {
  alert(useCatStore.get().age);
};

const toggleIsSleeping = () => {
  useCatStore.set((state) => ({ isSleeping: !state.isSleeping }));
};

const unsub = useCatStore.subscribe(
  // Action
  (state) => {
    console.log('The value of age is changed!', state.age);
  },
  // Reactivity dependency (just like useEffect dependency mentioned above)
  (state) => [state.age],
  // ^If not set, the action will be triggered on every state change
);
```

> **Examples:**
>
> - [https://codesandbox.io/.../examples/react/basic](https://codesandbox.io/p/sandbox/github/afiiif/floppy-disk/tree/main/examples/react/basic)
> - [https://codesandbox.io/.../examples/react/custom-reactivity](https://codesandbox.io/p/sandbox/github/afiiif/floppy-disk/tree/main/examples/react/custom-reactivity)

### Advanced Concept

Set the state **silently** (without broadcast the state change to **any subscribers**).

```jsx
const decreaseAgeSilently = () => {
  useCatStore.set((state) => ({ age: state.age }), true);
  //                                               ^silent param
};
//                👇 Will not re-render
function Cat() {
  const { age } = useCatStore((state) => [state.age]);
  return <div>Cat's age: {age}</div>;
}
```

Store events & interception.

```js
const useCatStore = createStore(
  ({ set }) => ({
    age: 0,
    isSleeping: false,
    increaseAge: () => set((state) => ({ age: state.age + 1 })),
    reset: () => set({ age: 0, isSleeping: false }),
  }),
  {
    onFirstSubscribe: (state) => {
      console.log('onFirstSubscribe', state);
    },
    onSubscribe: (state) => {
      console.log('onSubscribe', state);
    },
    onUnsubscribe: (state) => {
      console.log('onUnsubscribe', state);
    },
    onLastUnsubscribe: (state) => {
      console.log('onLastUnsubscribe', state);
    },
    intercept: (nextState, prevState) => {
      if (nextState.age !== prevState.age) {
        return { ...nextState, isSleeping: false };
      }
      return nextState;
    },
  },
);
```

> **Examples:**
>
> - [https://codesandbox.io/.../examples/react/store-event](https://codesandbox.io/p/sandbox/github/afiiif/floppy-disk/tree/main/examples/react/store-event)
> - [https://codesandbox.io/.../examples/react/intercept](https://codesandbox.io/p/sandbox/github/afiiif/floppy-disk/tree/main/examples/react/intercept)

Let's go wild using IIFE.

```js
const useCatStore = createStore(
  ({ set }) => ({
    age: 0,
    isSleeping: false,
    increaseAge: () => set((state) => ({ age: state.age + 1 })),
    reset: () => set({ age: 0, isSleeping: false }),
  }),
  (() => {
    const validateCat = () => {
      console.info('Window focus event triggered...');
      const { age } = useCatStore.get();
      if (age > 5) useCatStore.set({ age: 1 });
    };
    return {
      onFirstSubscribe: () => window.addEventListener('focus', validateCat),
      onLastUnsubscribe: () => window.removeEventListener('focus', validateCat),
    };
  })(),
);
```

Prevent re-render using `Watch`.

```jsx
function CatPage() {
  const { age } = useCatStore((state) => [state.age]);
  // If age changed, this component will re-render which will cause
  // HeavyComponent1 & HeavyComponent2 to be re-rendered as well.
  return (
    <main>
      <HeavyComponent1 />
      <div>Cat's age: {age}</div>
      <HeavyComponent2 />
    </main>
  );
}

// Optimized
function CatPageOptimized() {
  return (
    <main>
      <HeavyComponent1 />
      <useCatStore.Watch
        selectDeps={(state) => [state.age]}
        render={({ age }) => {
          return <div>Cat's age: {age}</div>;
        }}
      />
      <HeavyComponent2 />
    </main>
  );
}
```

> **Examples:**
>
> - [https://codesandbox.io/.../examples/react/watch-component](https://codesandbox.io/p/sandbox/github/afiiif/floppy-disk/tree/main/examples/react/watch-component)

Want a local state instead of global state?  
Or, want to set the initial state inside component?

```jsx
const [CatStoreProvider, useCatStoreContext] = withContext(() =>
  createStore(({ set }) => ({
    age: 0,
    isSleeping: false,
    increaseAge: () => set((state) => ({ age: state.age + 1 })),
    reset: () => set({ age: 0, isSleeping: false }),
  })),
);

function Parent() {
  return (
    <>
      <CatStoreProvider>
        <CatAge />
        <CatIsSleeping />
        <WillNotReRenderAsCatStateChanged />
      </CatStoreProvider>

      <CatStoreProvider>
        <CatAge />
        <CatIsSleeping />
        <WillNotReRenderAsCatStateChanged />
      </CatStoreProvider>

      <CatStoreProvider onInitialize={(store) => store.set({ age: 99 })}>
        <CatAge />
        <CatIsSleeping />
        <WillNotReRenderAsCatStateChanged />
      </CatStoreProvider>
    </>
  );
}

function CatAge() {
  const { age } = useCatStoreContext()((state) => [state.age]);
  return <div>Age: {age}</div>;
}
function CatIsSleeping() {
  const useCatStore = useCatStoreContext();
  const { isSleeping } = useCatStore((state) => [state.isSleeping]);
  return (
    <>
      <div>Is Sleeping: {String(isSleeping)}</div>
      <button onClick={useCatStore.get().increase}>Increase cat age</button>
    </>
  );
}
```

Set default reactivity.

```jsx
const useCatStore = createStore(
  ({ set }) => ({
    age: 0,
    isSleeping: false,
    increaseAge: () => set((state) => ({ age: state.age + 1 })),
    reset: () => set({ age: 0, isSleeping: false }),
  }),
  {
    defaultDeps: (state) => [state.age], // 👈
  },
);

function Cat() {
  const { age } = useCatStore();
  //                          ^will only re-render when age changed
  return <div>Cat's age: {age}</div>;
}
```

## Stores

The concept is same as [store](#store), but this can be used for multiple stores.

You need to specify the store key (an object) as identifier.

```js
import { createStores } from 'floppy-disk';

const useCatStores = createStores(
  ({ set, get, key }) => ({
    //         ^store key
    age: 0,
    isSleeping: false,
    increaseAge: () => set((state) => ({ age: state.age + 1 })),
    reset: () => set({ age: 0, isSleeping: false }),
  }),
  {
    onBeforeChangeKey: (nextKey, prevKey) => {
      console.log('Store key changed', nextKey, prevKey);
    },
    // ... same as createStore
  },
);

function CatPage() {
  const [catId, setCatId] = useState(1);

  return (
    <>
      <div>Current cat id: {catId}</div>
      <button onClick={() => setCatId((prev) => prev - 1)}>Prev cat</button>
      <button onClick={() => setCatId((prev) => prev + 1)}>Next cat</button>

      <Cat catId={catId} />
      <Control catId={catId} />
    </>
  );
}

function Cat({ catId }) {
  const { age } = useCatStores({ catId }, (state) => [state.age]);
  return <div>Cat's age: {age}</div>;
}

function Control({ catId }) {
  const { increaseAge } = useCatStores({ catId }, (state) => [state.increaseAge]);
  return <button onClick={increaseAge}>Increase cat's age</button>;
}
```

> **Examples:**
>
> - [https://codesandbox.io/.../examples/react/stores](https://codesandbox.io/p/sandbox/github/afiiif/floppy-disk/tree/main/examples/react/stores)

## Query & Mutation

With the power of `createStores` function and a bit creativity, we can easily create a hook just like `useQuery` and `useInfiniteQuery` in [React-Query](https://tanstack.com/query) using `createQuery` function.

It can dedupe multiple request, handle caching, auto-update stale data, handle retry on error, handle infinite query, and many more. With the flexibility given in `createStores`, you can extend its power according to your needs.

### Single Query

```jsx
const useGitHubQuery = createQuery(async () => {
  const res = await fetch('https://api.github.com/repos/afiiif/floppy-disk');
  if (res.ok) return res.json();
  throw res;
});

function SingleQuery() {
  const { isLoading, data } = useGitHubQuery();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1>{data.name}</h1>
      <p>{data.description}</p>
      <strong>⭐️ {data.stargazers_count}</strong>
      <strong>🍴 {data.forks_count}</strong>
    </div>
  );
}
```

> **Examples:**
>
> - [https://codesandbox.io/.../examples/react/query](https://codesandbox.io/p/sandbox/github/afiiif/floppy-disk/tree/main/examples/react/query)

Custom reactivity:

```jsx
// This component doesn't care whether the query is success or error.
// It just listening to network fetching state. 👇
function SingleQueryLoader() {
  const { isWaiting } = useGitHubQuery((state) => [state.isWaiting]);
  return <div>Is network fetching? {String(isWaiting)}</div>;
}
```

Actions:

```jsx
function Actions() {
  const { fetch, forceFetch, markAsStale, reset } = useGitHubQuery(() => []);
  return (
    <>
      <button onClick={fetch}>Call query if the query data is stale</button>
      <button onClick={forceFetch}>Call query</button>
      <button onClick={markAsStale}>Invalidate query</button>
      <button onClick={reset}>Reset query</button>
    </>
  );
}
```

Options:

```jsx
const useGitHubQuery = createQuery(
  async () => {
    const res = await fetch('https://api.github.com/repos/afiiif/floppy-disk');
    if (res.ok) return res.json();
    throw res;
  },
  {
    fetchOnMount: false,
    enabled: () => !!useUserQuery.get().data?.user,
    select: (response) => response.name
    staleTime: Infinity, // Never stale
    retry: 0, // No retry
    onSuccess: (response) => {},
    onError: (error) => {},
    onSettled: () => {},
  },
);
```

Get data or do something outside component:

```jsx
const getData = () => {
  console.log(useGitHubQuery.get().data);
};

const resetQuery = () => {
  useGitHubQuery.get().reset();
};

function Actions() {
  return (
    <>
      <button onClick={getData}>Get Data</button>
      <button onClick={resetQuery}>Reset query</button>
    </>
  );
}
```

### Single Query with Params

```jsx
const usePokemonQuery = createQuery(async ({ pokemon }) => {
  const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemon}`);
  if (res.ok) return res.json();
  throw res;
});

function PokemonPage() {
  const [currentPokemon, setCurrentPokemon] = useState();
  const { isLoading, data } = usePokemonQuery({ pokemon: currentPokemon });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1>{data.name}</h1>
      <div>Weight: {data.weight}</div>
    </div>
  );
}
```

Get data or do something outside component:

```jsx
const getDitto = () => {
  console.log(usePokemonQuery.get({ pokemon: 'ditto' }).data);
};

const resetDitto = () => {
  usePokemonQuery.get({ pokemon: 'ditto' }).reset();
};

function Actions() {
  return (
    <>
      <button onClick={getDitto}>Get Ditto Data</button>
      <button onClick={resetDitto}>Reset Ditto</button>
    </>
  );
}
```

### Paginated Query or Infinite Query

```jsx
const usePokemonsInfQuery = createQuery(
  async (_, { pageParam = 0 }) => {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=10&offset=${pageParam}`);
    if (res.ok) return res.json();
    throw res;
  },
  {
    select: (response, { data }) => [...(data || []), ...response.results],
    getNextPageParam: (lastPageResponse, i) => {
      if (i > 5) return undefined; // Return undefined means you have reached the end of the pages
      return i * 10;
    },
  },
);

function PokemonListPage() {
  const { data, fetchNextPage, hasNextPage, isWaitingNextPage } = usePokemonsInfQuery();

  return (
    <div>
      {data?.map((pokemon) => (
        <div key={pokemon.name}>{pokemon.name}</div>
      ))}
      {isWaitingNextPage ? (
        <div>Loading more...</div>
      ) : (
        hasNextPage && <button onClick={fetchNextPage}>Load more</button>
      )}
    </div>
  );
}
```

**Note:**

- The default stale time is 3 seconds.
- The default error retry attempt is 1 time, and retry delay is 3 seconds.
- The default reactivity of a query is `(s) => [s.data, s.error]`.  
  (For paginated: `(s) => [s.data, s.error, s.isWaitingNextPage, s.hasNextPage]`)
- You can change the `defaultDeps` on `createQuery` options.

### Mutation

```jsx
const useLoginMutation = createMutation(
  async (variables) => {
    const res = await axios.post('/auth/login', {
      email: variables.email,
      password: variables.password,
    });
    return res.data;
  },
  {
    onSuccess: (response, variables) => {
      console.log(`Logged in as ${variables.email}`);
      console.log(`Access token: ${response.data.accessToken}`);
    },
  },
);

function Login() {
  const { mutate, isWaiting } = useLoginMutation();
  const showToast = useToast();
  return (
    <div>
      <button
        disabled={isWaiting}
        onClick={() =>
          mutate({ email: 'foo@bar.baz', password: 's3cREt' }).then(({ response, error }) => {
            if (error) {
              showToast('Login failed');
            } else {
              showToast('Login success');
            }
          })
        }
      >
        Login
      </button>
    </div>
  );
}
```

> **Examples:**
>
> - [https://codesandbox.io/.../examples/react/mutation](https://codesandbox.io/p/sandbox/github/afiiif/floppy-disk/tree/main/examples/react/mutation)

<br><br>

<p align="center">
  — ✨ 💾 ✨ —
</p>
<br>

## Important Notes

Don't mutate.

```js
import { createStore } from 'floppy-disk';

const useCartStore = createStore(({ set, get }) => ({
  products: [],
  addProduct: (newProduct) => {
    const currentProducts = get().products;
    product.push(newProduct); // ❌ Don't mutate
    set({ product });
  },
}));
```

You don't need to memoize the reactivity selector.

```jsx
function Cat() {
  const selectAge = useCallback((state) => [state.age], []); // ❌
  const { age } = useCatStore(selectAge);
  return <div>Cat's age: {age}</div>;
}
```

Don't use conditional reactivity selector.

```jsx
function Cat({ isSomething }) {
  const { age } = useCatStore(isSomething ? (state) => [state.age] : null); // ❌
  return <div>Cat's age: {age}</div>;
}
```
