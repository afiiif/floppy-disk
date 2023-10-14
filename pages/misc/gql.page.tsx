import { createMutation, createQuery, fetcher } from '../../src';

const useLocationQuery = createQuery<{ search: string }>(
  fetcher({
    url: 'https://stg-sawarna-v2.service.efishery.com/graphql',
    headers: {
      'X-Client-Id': 'EFISHERYKU',
      'X-Client-Version': 'local',
    },
    query: /* GraphQL */ `
      query Locations($search: String) {
        support_v2_locations(search: $search, limit: "20") {
          data {
            id
            province_id
            province_name
            city_id
            city_name
            district_id
            district_name
            subdistrict_id
            subdistrict_name
            zip_code
          }
        }
      }
    `,
  }),
);

const usePokemonMutation = createMutation<{ x: string }>(
  fetcher(({ x }) => ({
    url: 'https://beta.pokeapi.co/graphql/v1beta',
    query: /* GraphQL */ `
      {
        a: pokemon_v2_pokemon(where: { name: { _eq: "pikachu" } }) {
          id
          name
          height${x === 'a' ? 'a' : ''}
        }
      }
    `,
    payload: {},
  })),
);

const useSearchPokemonsQuery = createQuery(
  fetcher({
    url: 'https://beta.pokeapi.co/graphql/v1beta',
    query: `
      query Pokemon($search: String) {
        pokemon_v2_pokemon(where: { name:{ _like: $search } }) {
          id
          name
        }
      }
    `,
  }),
);

export default function GqlDemo() {
  const qLocation = useLocationQuery({ search: 'pekal' });
  const { mutate, response, error } = usePokemonMutation();
  useSearchPokemonsQuery({ search: '%cha%' });

  return (
    <div>
      <h1>GraphQL 🔥</h1>
      <hr />

      <pre className="text-xs h-[30rem] mt-5 overflow-auto border p-4">
        {JSON.stringify(qLocation.data, null, 2)}
      </pre>
      <div className="flex gap-4 py-5">
        <button
          className="btn"
          onClick={() =>
            mutate({ x: 'pikachu' }).then((result) => {
              console.info(result);
            })
          }
        >
          Mutate 1
        </button>
        <button
          className="btn"
          onClick={() =>
            mutate({ x: 'a' }).then((result) => {
              console.info(result);
            })
          }
        >
          Mutate 2
        </button>
      </div>

      <div className="flex gap-2">
        <pre className="text-xs h-[30rem] mt-5 overflow-auto border p-4">
          {JSON.stringify(response, null, 2)}
        </pre>
        <pre className="text-xs h-[30rem] mt-5 overflow-auto border p-4">
          {JSON.stringify(error, null, 2)}
        </pre>
      </div>
    </div>
  );
}
