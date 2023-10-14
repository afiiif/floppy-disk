import { createQuery, fetcher } from '../../src';
import { Pokemon } from './api';

export const usePokemonQuery = createQuery<{ pokemonName: string }, Pokemon>(
  fetcher(({ pokemonName }) => ({ url: `https://pokeapi.co/api/v2/pokemon/${pokemonName}` })),
  {
    // keepPreviousData: true,
    enabled: ({ pokemonName }) => !!pokemonName,
    onSuccess: (response, { key }) => {
      console.info(key, response);
    },
  },
);

export default function WithParam({ pokemonName }: { pokemonName: string }) {
  const { isLoading, data, error } = usePokemonQuery({ pokemonName });
  console.log(error);

  if (!pokemonName) return <div>Select a pokemon 👆</div>;
  if (isLoading) return <div>Loading...</div>;
  if (data) return <WithParamContent pokemonName={pokemonName} />;
  return <div>Error!</div>;
}

function WithParamContent({ pokemonName }: { pokemonName: string }) {
  const { data } = usePokemonQuery({ pokemonName });

  return (
    <div>
      <h3 className="text-lg font-semibold text-rose-500">{data!.name}</h3>
      <ul className="list-disc pl-7">
        <li>Height: {data!.height}</li>
        <li>Weight: {data!.weight}</li>
      </ul>
    </div>
  );
}
