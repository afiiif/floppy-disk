export type RepoDetailResponse = {
  id: number;
  name: string;
  full_name: string;
  description: string;
  html_url: string;
};
export const fetchFloppyDiskRepo = async (): Promise<RepoDetailResponse> => {
  const res = await fetch('https://api.github.com/repos/afiiif/floppy-disk');
  if (res.ok) return res.json();
  throw res;
};

export type Pokemon = {
  id: number;
  name: string;
  height: number;
  weight: number;
};
export const getPokemon = async (pokemonName: string): Promise<Pokemon> => {
  const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonName}`);
  if (res.ok) return res.json();
  throw res;
};
