import { render } from 'preact';
import { useState } from 'preact/hooks';

import { createStores } from 'floppy-disk';

function App() {
  const [catId, setCatId] = useState(1);

  return (
    <main>
      <h1>💾 Floppy Disk - Stores</h1>

      <div>Current cat id: {catId}</div>
      <button onClick={() => setCatId((prev) => prev - 1)}>Prev cat</button>
      <button onClick={() => setCatId((prev) => prev + 1)}>Next cat</button>
      <hr />

      <CatAge id={catId} />
      <CatIsSleeping id={catId} />
      <CatControl id={catId} />
    </main>
  );
}

const useCatStores = createStores(
  ({ set }) => ({
    age: 0,
    isSleeping: false,
    increaseAge: () => set((state) => ({ age: state.age + 1 })),
  }),
  {
    onBeforeChangeKey: (nextKey, prevKey) => {
      console.log('Store key changed', nextKey, prevKey);
    },
  },
);

function CatAge({ id }) {
  const { age } = useCatStores({ id }, (state) => [state.age]);
  return <p>Cat's age: {age}</p>;
}

function CatIsSleeping({ id }) {
  const { isSleeping } = useCatStores({ id }, (state) => [state.isSleeping]);
  return <p>Is sleeping: {String(isSleeping)}</p>;
}

function CatControl({ id }) {
  const { increaseAge } = useCatStores({ id }, () => []);
  return (
    <div>
      <button onClick={increaseAge}>Increase cat's age</button>
      <button
        onClick={() => useCatStores.set({ id }, (prev) => ({ isSleeping: !prev.isSleeping }))}
      >
        Toggle isSleeping
      </button>
    </div>
  );
}

render(<App />, document.getElementById('app'));
