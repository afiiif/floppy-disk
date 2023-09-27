import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';

import { createQuery } from 'floppy-disk';

const usePsyduckQuery = createQuery(
  async () => {
    const res = await fetch('https://pokeapi.co/api/v2/pokemon/psyduck');
    if (res.ok) return res.json();
    throw res;
  },
  {
    defaultDeps: (state) => [state.data, state.error, state.isWaiting],
    onBeforeFetch: (cancel) => {
      if (!navigator.onLine) cancel();
    },
  },
);

const useEeveeQuery = createQuery(
  async () => {
    const res = await fetch('https://pokeapi.co/api/v2/pokemon/eevee-x'); // Expected wrong URL, to simulate error
    if (res.ok) return res.json();
    throw res;
  },
  {
    defaultDeps: (state) => [state.data, state.error, state.isWaiting],
    retry: () => {
      if (navigator.onLine) return 2;
      return 0;
    },
  },
);

function App() {
  const [showQuery1, setShowQuery1] = useState(false);
  const [showQuery2, setShowQuery2] = useState(false);

  return (
    <main>
      <h1>💾 Floppy Disk - Query & Network Status</h1>

      <hr />
      <h2>Example 1: Disable fetch when offline</h2>
      <button onClick={() => setShowQuery1((p) => !p)}>Toggle query 1</button>
      {showQuery1 && <Query1 />}

      <hr />
      <h2>Example 2: Disable retries when offline</h2>
      <button onClick={() => setShowQuery2((p) => !p)}>Toggle query 2</button>
      {showQuery2 && <Query2 />}
    </main>
  );
}

function Query1() {
  const { data = {}, isWaiting } = usePsyduckQuery();
  return (
    <section>
      <ul>
        <li>ID: {data.id}</li>
        <li>Name: {data.name}</li>
        <li>Height: {data.height}</li>
      </ul>
      {isWaiting && <div>Fetching data... ⏳</div>}
    </section>
  );
}

function Query2() {
  const { data = {}, isWaiting } = useEeveeQuery();
  return (
    <section>
      <ul>
        <li>ID: {data.id}</li>
        <li>Name: {data.name}</li>
        <li>Height: {data.height}</li>
      </ul>
      {isWaiting && <div>Fetching data... ⏳</div>}
    </section>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
