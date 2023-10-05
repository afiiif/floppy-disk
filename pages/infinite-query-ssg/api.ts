const POKE_API = 'https://beta.pokeapi.co/graphql/v1beta';

export type PokemonsResponse = {
  data: {
    species: {
      id: number;
      name: string;
      pokemon: Pokemon[];
    }[];
  };
};
export type Pokemon = {
  id: number;
  name: string;
  height: number;
  weight: number;
};
export const fetchPokemons = async (variables: {
  generation: string;
  offset: number;
  limit?: number;
}): Promise<PokemonsResponse> => {
  const res = await fetch(POKE_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: /* GraphQL */ `
        query Pokemons($generation: String!, $offset: Int = 0, $limit: Int = 10) {
          species: pokemon_v2_pokemonspecies(
            where: { pokemon_v2_generation: { name: { _eq: $generation } } }
            order_by: { id: asc }
            limit: $limit
            offset: $offset
          ) {
            id
            name
            pokemon: pokemon_v2_pokemons(where: { is_default: { _eq: true } }) {
              id
              name
              height
              weight
            }
          }
        }
      `,
      variables,
    }),
  });
  if (res.ok) return res.json();
  throw res;
};

export const FIRST_PAGE_RESPONSE = {
  data: {
    species: [
      {
        id: 1,
        name: 'bulbasaur',
        pokemon: [{ id: 1, name: 'bulbasaur', height: 7, weight: 69 }],
      },
      {
        id: 2,
        name: 'ivysaur',
        pokemon: [{ id: 2, name: 'ivysaur', height: 10, weight: 130 }],
      },
      {
        id: 3,
        name: 'venusaur',
        pokemon: [{ id: 3, name: 'venusaur', height: 20, weight: 1000 }],
      },
      {
        id: 4,
        name: 'charmander',
        pokemon: [{ id: 4, name: 'charmander', height: 6, weight: 85 }],
      },
      {
        id: 5,
        name: 'charmeleon',
        pokemon: [{ id: 5, name: 'charmeleon', height: 11, weight: 190 }],
      },
      {
        id: 6,
        name: 'charizard',
        pokemon: [{ id: 6, name: 'charizard', height: 17, weight: 905 }],
      },
      {
        id: 7,
        name: 'squirtle',
        pokemon: [{ id: 7, name: 'squirtle', height: 5, weight: 90 }],
      },
      {
        id: 8,
        name: 'wartortle',
        pokemon: [{ id: 8, name: 'wartortle', height: 10, weight: 225 }],
      },
      {
        id: 9,
        name: 'blastoise',
        pokemon: [{ id: 9, name: 'blastoise', height: 16, weight: 855 }],
      },
      {
        id: 10,
        name: 'caterpie',
        pokemon: [{ id: 10, name: 'caterpie', height: 3, weight: 29 }],
      },
    ],
  },
};
