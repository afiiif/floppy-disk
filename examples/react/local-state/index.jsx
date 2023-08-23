import React from 'react';
import ReactDOM from 'react-dom/client';

import { createStore, withContext } from 'floppy-disk';

const [CatStoreProvider, useCatStoreContext] = withContext(() =>
  createStore(({ set }) => ({
    age: 0,
    isSleeping: false,
    increaseAge: () => set((state) => ({ age: state.age + 1 })),
  })),
);

function App() {
  return (
    <main>
      <h1>💾 Floppy Disk - Local State</h1>

      <CatStoreProvider>
        <CatAge />
        <CatIsSleeping />
        <WillNotReRenderAsCatStateChanged />
        <CatControl />
      </CatStoreProvider>
      <hr />
      <CatStoreProvider>
        <CatAge />
        <CatIsSleeping />
        <WillNotReRenderAsCatStateChanged />
        <CatControl />
      </CatStoreProvider>
      <hr />
      <CatStoreProvider onInitialize={(store) => store.set({ age: 99 })}>
        <CatAge />
        <CatIsSleeping />
        <WillNotReRenderAsCatStateChanged />
        <CatControl />
      </CatStoreProvider>
    </main>
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
    </>
  );
}
function CatControl() {
  const useCatStore = useCatStoreContext();
  return (
    <>
      <button onClick={useCatStore.get().increaseAge}>Increase cat age</button>
      <button onClick={() => useCatStore.set((prev) => ({ isSleeping: !prev.isSleeping }))}>
        Toggle isSleeping
      </button>
    </>
  );
}

function WillNotReRenderAsCatStateChanged() {
  return <div>Last re-render: {new Date().toLocaleString()}</div>;
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
