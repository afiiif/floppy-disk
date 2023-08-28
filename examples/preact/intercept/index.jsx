import { render } from 'preact';

import { createStore } from 'floppy-disk';

function App() {
  return (
    <main>
      <h1>💾 Floppy Disk - Store - Intercept</h1>
      <CatAge />
      <CatIsSleeping />
      <CatControl />
      <GetOrSetOutsideComponent />
    </main>
  );
}

const useCatStore = createStore(
  ({ set }) => ({
    age: 0,
    isSleeping: false,
    increaseAge: () => set((state) => ({ age: state.age + 1 })),
    reset: () => set({ age: 0, isSleeping: false }),
  }),
  {
    intercept: (nextState, prevState) => {
      if (nextState.isSleeping === false && nextState.isSleeping !== prevState.isSleeping) {
        return { ...nextState, age: 0 };
      }
      if (nextState.age > 9) {
        return { age: 0, isSleeping: true };
      }
      return nextState;
    },
  },
);

function CatAge() {
  const { age } = useCatStore((state) => [state.age]);
  return <p>Cat's age: {age}</p>;
}

function CatIsSleeping() {
  const { isSleeping } = useCatStore((state) => [state.isSleeping]);
  return <p>Is sleeping: {String(isSleeping)}</p>;
}

function CatControl() {
  const { increaseAge } = useCatStore(() => []);
  return <button onClick={increaseAge}>Increase cat's age</button>;
}

function GetOrSetOutsideComponent() {
  return (
    <>
      <button onClick={() => useCatStore.set((prev) => ({ isSleeping: !prev.isSleeping }))}>
        Toggle isSleeping
      </button>
      <button
        onClick={() => {
          const catStore = useCatStore.get();
          alert(JSON.stringify(catStore, null, 2));
        }}
      >
        Get value
      </button>
    </>
  );
}

render(<App />, document.getElementById('app'));
