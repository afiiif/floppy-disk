import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';

import { createStore } from 'floppy-disk';

function App() {
  const [showAge, setShowAge] = useState(false);
  const [showIsSleeping, setShowIsSleeping] = useState(false);

  return (
    <main>
      <h1>💾 Floppy Disk - Store - Event</h1>

      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={() => setShowAge((prev) => !prev)}>Toggle show age</button>
        {showAge && <CatAge />}
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={() => setShowIsSleeping((prev) => !prev)}>Toggle show isSleeping</button>
        {showIsSleeping && <CatIsSleeping />}
      </div>

      <hr />
      <CatControl />
    </main>
  );
}

const useCatStore = createStore(
  () => ({
    age: 0,
    isSleeping: false,
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
  },
);

const increaseAge = () => useCatStore.set((prev) => ({ age: prev.age + 1 }));
const toggleIsSleeping = () => useCatStore.set((prev) => ({ isSleeping: !prev.isSleeping }));

function CatAge() {
  const { age } = useCatStore((state) => [state.age]);
  return <p>Cat's age: {age}</p>;
}

function CatIsSleeping() {
  const { isSleeping } = useCatStore((state) => [state.isSleeping]);
  return <p>Is sleeping: {String(isSleeping)}</p>;
}

function CatControl() {
  return (
    <>
      <button onClick={increaseAge}>Increase cat's age</button>
      <button onClick={toggleIsSleeping}>Toggle isSleeping</button>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
