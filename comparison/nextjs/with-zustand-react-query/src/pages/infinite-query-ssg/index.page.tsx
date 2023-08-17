import { QueryClient, dehydrate, useInfiniteQuery } from '@tanstack/react-query';
import { FIRST_PAGE_RESPONSE, Pokemon, fetchPokemons } from './api';
import { useState } from 'react';
import Head from 'next/head';

export async function getStaticProps() {
  const queryClient = new QueryClient();

  // await queryClient.prefetchInfiniteQuery(['pokemons', 'generation-i'], () =>
  //   fetchPokemons({ generation: 'generation-i', offset: 0 }),
  // );
  // ^Sometimes error fetching, therefore replaced with hardcoded response
  await queryClient.prefetchInfiniteQuery(['pokemons', 'generation-i'], () => FIRST_PAGE_RESPONSE);

  return {
    props: {
      dehydratedState: JSON.parse(JSON.stringify(dehydrate(queryClient), null, 2)),
    },
  };
}

export default function InfiniteQuerySsgPage() {
  const [generation, setGeneration] = useState('generation-i');
  const [currentPokemon, setCurrentPokemon] = useState<Pokemon>();

  const { data, fetchNextPage, isFetchingNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ['pokemons', generation],
    queryFn: ({ pageParam }) => fetchPokemons({ generation, offset: pageParam }),
    getNextPageParam: (lastPage, allPages) => {
      const currentOffset = allPages.length * 10;
      if (currentOffset < 100) return currentOffset + 10;
    },
    retry: 0,
    staleTime: 3_000,
  });

  return (
    <>
      <Head>
        <title>Infinite Query SSG | Zustand & React-Query</title>
        <meta
          property="og:title"
          content="Infinite Query SSG | Zustand & React-Query"
          key="title"
        />
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
            {data?.pages
              .flatMap((page) => page.data?.species || [])
              .map((species) => {
                return (
                  <li key={species.name}>
                    <button
                      onClick={() => setCurrentPokemon(species.pokemon[0])}
                      className="border mb-2 px-3 py-1 rounded-lg w-full capitalize hover:bg-neutral-100"
                    >
                      {species.name}
                    </button>
                  </li>
                );
              })}
            {hasNextPage && (
              <button
                className="btn w-full"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? '⏳' : 'Load more'}
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
