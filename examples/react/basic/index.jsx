import React from 'react';
import ReactDOM from 'react-dom/client';

import { createStore } from 'floppy-disk';

function App() {
  return (
    <main>
      <h1>💾 Floppy Disk - Store</h1>
      <CatAge />
      <CatIsSleeping />
      <CatControl />
      <GetOrSetOutsideComponent />
    </main>
  );
}

const useCatStore = createStore(({ set }) => ({
  age: 0,
  isSleeping: false,
  increaseAge: () => set((state) => ({ age: state.age + 1 })),
  reset: () => set({ age: 0, isSleeping: false }),
}));

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

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
