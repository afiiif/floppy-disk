# Floppy Disk 💾

A lightweight, simple, and powerful state management library.

This library was highly-inspired by [Zustand](https://www.npmjs.com/package/zustand) and [React-Query](https://tanstack.com/query). Both are awesome state manager, but I want to have something like that with **more power** and **less bundle size**.

If you are familiar with both libraries, you might want to jump into the [comparison section](#comparison).

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

## Stores. Yes, it's plural!

The concept is same as [store](#store), but this can be used for multiple store.

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

## Query & Mutation

🚧 TODO

## Comparison

🚧 TODO
