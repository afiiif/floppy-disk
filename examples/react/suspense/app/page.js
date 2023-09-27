'use client';

import { Suspense, useEffect, useState } from 'react';

import { createQuery } from 'floppy-disk';

const usePokemonQuery = createQuery(
  async ({ pokemonName }) => {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonName}`);
    if (res.ok) return res.json();
    throw res;
  },
  {
    enabled: ({ pokemonName }) => !!pokemonName,
    onBeforeFetch: (_, state) => {
      console.info(state);
    },
  },
);

export default function App() {
  const [pokemonName, setPokemonName] = useState();

  return (
    <main>
      <h1>💾 Floppy Disk - Suspense</h1>

      <Suspense fallback={<div>Loading... ⏳</div>}>
        <PokemonDetail pokemonName="pikachu" />
      </Suspense>

      <hr />

      <div style={{ display: 'flex', gap: 8, margin: '1.75rem 0' }}>
        <button onClick={() => setPokemonName('bulbasaur')}>bulbasaur</button>
        <button onClick={() => setPokemonName('charmander')}>charmander</button>
        <button onClick={() => setPokemonName('squirtle')}>squirtle</button>
      </div>

      {pokemonName ? (
        <Suspense fallback={<div>Loading... ⏳</div>}>
          <PokemonDetail pokemonName={pokemonName} />
        </Suspense>
      ) : (
        <h2>Select a pokemon...</h2>
      )}
    </main>
  );
}

function PokemonDetail({ pokemonName }) {
  const { data } = usePokemonQuery.suspend({ pokemonName });
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
