import Head from 'next/head';
import { useState } from 'react';

import WithoutParam from './WithoutParam';
import WithParam from './WithParam';

export default function SingleQueryPage() {
  return (
    <>
      <Head>
        <title>Single Query</title>
        <meta property="og:title" content="Single Query" key="title" />
      </Head>
      <h1 className="h1">Single Query</h1>

      <h2 className="h2 border-b">Without Param</h2>
      <WithoutParam />

      <Pokemon />
      <Pokemon />
    </>
  );
}

function Pokemon() {
  const [pokemonName, setPokemonName] = useState('');

  return (
    <>
      <h2 className="h2 border-b">With Param</h2>
      <div className="flex gap-2 flex-wrap pb-4">
        <button onClick={() => setPokemonName('bulbasaur')} className="btn">
          bulbasaur
        </button>
        <button onClick={() => setPokemonName('charmander')} className="btn">
          charmander
        </button>
        <button onClick={() => setPokemonName('squirtle')} className="btn">
          squirtle
        </button>
      </div>
      <WithParam pokemonName={pokemonName} />
    </>
  );
}
