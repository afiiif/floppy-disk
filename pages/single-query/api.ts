export type RepoDetailResponse = {
  id: number;
  name: string;
  full_name: string;
  description: string;
  html_url: string;
};

export type Pokemon = {
  id: number;
  name: string;
  height: number;
  weight: number;
};
