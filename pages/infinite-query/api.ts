export type SearchRepoResponse = {
  total_count: number;
  items: {
    id: number;
    name: string;
    full_name: string;
    description: string;
    html_url: string;
  }[];
};
export const fetchRepos = async (options: {
  q: string;
  page: number;
  perPage?: number;
}): Promise<SearchRepoResponse> => {
  const { q, page, perPage = 10 } = options;
  const res = await fetch(
    'https://api.github.com/search/repositories' +
      `?q=${encodeURIComponent(q)}&per_page=${perPage}&page=${page}`,
  );
  if (res.ok) return res.json();
  throw res;
};
