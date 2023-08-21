import React from 'react';
import ReactDOM from 'react-dom/client';

import { createStore } from 'floppy-disk';

function App() {
  return (
    <main>
      <h1>💾 Floppy Disk - Store - Custom Reactivity</h1>
      <CatControl />

      <ReRenderWhenStateChanged />
      <ReRenderWhenAgeChanged />
      <ReRenderWhenIsSleepingChanged />
      <ReRenderNever />
    </main>
  );
}

const useCatStore = createStore(() => ({
  age: 0,
  isSleeping: false,
}));
const increaseAge = () => useCatStore.set((prev) => ({ age: prev.age + 1 }));
const toggleIsSleeping = () => useCatStore.set((prev) => ({ isSleeping: !prev.isSleeping }));

function CatControl() {
  return (
    <>
      <button onClick={increaseAge}>Increase cat's age</button>
      <button onClick={toggleIsSleeping}>Toggle isSleeping</button>
    </>
  );
}

function ReRenderWhenStateChanged() {
  const { age, isSleeping } = useCatStore();
  return (
    <section>
      <p>Cat's age: {age}</p>
      <p>Is sleeping: {String(isSleeping)}</p>
    </section>
  );
}

function ReRenderWhenAgeChanged() {
  const { age, isSleeping } = useCatStore((state) => [state.age]);
  return (
    <section>
      <p>Cat's age: {age}</p>
      <p>Is sleeping: {String(isSleeping)}</p>
    </section>
  );
}

function ReRenderWhenIsSleepingChanged() {
  const { age, isSleeping } = useCatStore((state) => [state.isSleeping]);
  return (
    <section>
      <p>Cat's age: {age}</p>
      <p>Is sleeping: {String(isSleeping)}</p>
    </section>
  );
}

function ReRenderNever() {
  const { age, isSleeping } = useCatStore(() => []);
  return (
    <section>
      <p>Cat's age: {age}</p>
      <p>Is sleeping: {String(isSleeping)}</p>
    </section>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
