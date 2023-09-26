import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';

import { createQuery } from 'floppy-disk';

const usePokemonQuery = createQuery(
  async ({ pokemonName }) => {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonName}`);
    if (res.ok) return res.json();
    throw res;
  },
  {
    // keepPreviousData: true,
    enabled: ({ pokemonName }) => !!pokemonName,
    onSuccess: (response, { key }) => {
      console.info(key, response);
    },
  },
);

const getPikachu = () => {
  const { isSuccess, isError, error, data } = usePokemonQuery.get({ pokemonName: 'pikachu' });
  alert(JSON.stringify({ isSuccess, isError, error, data }, null, 2));
};

function App() {
  const [pokemonName, setPokemonName] = useState();

  return (
    <main>
      <h1>💾 Floppy Disk - Query with Param</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: '1.75rem' }}>
        <button onClick={() => setPokemonName('bulbasaur')}>bulbasaur</button>
        <button onClick={() => setPokemonName('charmander')}>charmander</button>
        <button onClick={() => setPokemonName('squirtle')}>squirtle</button>
        <button onClick={() => setPokemonName('pikachu')}>pikachu</button>
      </div>

      {pokemonName ? <PokemonDetail pokemonName={pokemonName} /> : <h2>Select a pokemon...</h2>}

      <hr />
      <button onClick={getPikachu}>Get data outside component</button>
    </main>
  );
}

function PokemonDetail({ pokemonName }) {
  const { isLoading, data } = usePokemonQuery({ pokemonName });

  if (isLoading) return <div>Loading...</div>;

  return (
    <>
      <h2>{data.name}</h2>
      <ul>
        <li>Order: {data.order}</li>
        <li>Height: {data.height}</li>
        <li>Weight: {data.weight}</li>
      </ul>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
