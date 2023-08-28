import { FIRST_PAGE_RESPONSE, Pokemon, PokemonsResponse, fetchPokemons } from './api';
import { useState } from 'react';
import Head from 'next/head';
import { createQuery } from 'floppy-disk';

export async function getStaticProps() {
  const pokemons = await fetchPokemons({ generation: 'generation-i', offset: 0 }).catch(
    () => FIRST_PAGE_RESPONSE,
  );

  return {
    props: {
      initialPokemons: pokemons,
    },
  };
}

const usePokemonsInfQuery = createQuery<{ generation: string }, PokemonsResponse, Pokemon[]>(
  ({ generation }, { pageParam }) => fetchPokemons({ generation, offset: pageParam }),
  {
    select: (response, { data }) => [
      ...(data || []),
      ...response.data.species.flatMap((species) => species.pokemon),
    ],
    getNextPageParam: (lastPage, i) => {
      const currentOffset = i * 10;
      if (currentOffset < 100) return currentOffset;
    },
    retry: 0,
    staleTime: 3_000,
  },
);

export default function InfiniteQuerySsgPage({
  initialPokemons,
}: {
  initialPokemons: PokemonsResponse;
}) {
  const [generation, setGeneration] = useState('generation-i');
  const [currentPokemon, setCurrentPokemon] = useState<Pokemon>();

  usePokemonsInfQuery.setInitialResponse({
    key: { generation },
    response: initialPokemons,
  });

  const { data, fetchNextPage, isWaitingNextPage, hasNextPage } = usePokemonsInfQuery({
    generation,
  });

  return (
    <>
      <Head>
        <title>Infinite Query SSG</title>
        <meta property="og:title" content="Infinite Query SSG" key="title" />
      </Head>
      <h1 className="h1">Infinite Query SSG</h1>

      <div className="flex gap-2 flex-wrap pb-4">
        <button onClick={() => setGeneration('generation-i')} className="btn">
          Generation I
        </button>
        <button onClick={() => setGeneration('generation-ii')} className="btn">
          Generation II
        </button>
        <button onClick={() => setGeneration('generation-iii')} className="btn">
          Generation III
        </button>
      </div>

      <div className="flex gap-6">
        <div className="border rounded-lg w-52 overflow-hidden">
          <div className="px-4 py-3 border-b font-semibold text-rose-500 text-center bg-rose-100 uppercase">
            {generation.replace('-', ' ')}
          </div>
          <ul className="p-4 max-h-[40rem] overflow-y-auto">
            {data?.map((pokemon) => {
              return (
                <li key={pokemon.name}>
                  <button
                    onClick={() => setCurrentPokemon(pokemon)}
                    className="border mb-2 px-3 py-1 rounded-lg w-full capitalize hover:bg-neutral-100"
                  >
                    {pokemon.name}
                  </button>
                </li>
              );
            })}
            {hasNextPage && (
              <button
                className="btn w-full"
                onClick={() => fetchNextPage()}
                disabled={isWaitingNextPage}
              >
                {isWaitingNextPage ? '⏳' : 'Load more'}
              </button>
            )}
          </ul>
        </div>
        <div className="border p-4 rounded-lg flex-1">
          {currentPokemon && (
            <>
              <h2 className="h2 capitalize mt-0">{currentPokemon.name}</h2>
              <div>Id: {currentPokemon.id}</div>
              <div>Weight: {currentPokemon.weight}</div>
              <div>Height: {currentPokemon.height}</div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
