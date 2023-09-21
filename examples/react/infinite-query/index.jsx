import React from 'react';
import ReactDOM from 'react-dom/client';

import { createQuery } from 'floppy-disk';

const usePokemonsInfQuery = createQuery(
  async (_, { pageParam = 0 }) => {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=10&offset=${pageParam}`, {
      cache: 'no-store',
    });
    const resJson = await res.json();
    if (res.ok) return resJson;
    throw resJson;
  },
  {
    select: (response, { data = [] }) => [...data, ...response.results],
    getNextPageParam: (lastPageResponse, i) => {
      if (i > 5) return undefined; // Return undefined means you have reached the end of the pages
      return i * 10;
    },
  },
);

function App() {
  const { data, fetchNextPage, hasNextPage, isWaitingNextPage, pageParams } = usePokemonsInfQuery();

  return (
    <main>
      <h1>💾 Floppy Disk - Infinite Query</h1>

      <div>{JSON.stringify({ pageParams }, null, 2)}</div>

      <ul>
        {data?.map((pokemon) => (
          <li key={pokemon.name}>{pokemon.name}</li>
        ))}
      </ul>

      {isWaitingNextPage ? (
        <div>Loading more...</div>
      ) : (
        hasNextPage && <button onClick={fetchNextPage}>Load more</button>
      )}
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
