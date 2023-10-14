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
