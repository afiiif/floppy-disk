import Head from 'next/head';

import { createQuery, fetcher } from '../../src';
import { SearchRepoResponse } from './api';

const keyword = 'chocobo language:javascript';

const useRepositoriesInfQuery = createQuery<
  undefined,
  SearchRepoResponse,
  { id: number; name: string; full_name: string; description: string; html_url: string }[]
>(
  fetcher((_, { pageParam = 1 }) => ({
    url: 'https://api.github.com/search/repositories',
    params: { q: keyword, page: pageParam, per_page: 10 },
  })),
  {
    select: (response, { data }) => [...(data || []), ...response.items],
    getNextPageParam: (lastPageResponse, i) => {
      const totalPages = Math.ceil(lastPageResponse.total_count / 10);
      if (i < totalPages) return i + 1;
    },
  },
);

export default function InfiniteQueryPage() {
  const { data, fetchNextPage, isWaitingNextPage, hasNextPage, error } = useRepositoriesInfQuery();
  console.info(error);

  return (
    <>
      <Head>
        <title>Infinite Query</title>
        <meta property="og:title" content="Infinite Query" key="title" />
      </Head>
      <h1 className="h1">Infinite Query</h1>

      <ul className="list-disc pl-7">
        {data?.map((repo) => {
          return <li key={repo.id}>{repo.full_name}</li>;
        })}
      </ul>

      <div className="pt-5">isWaitingNextPage: {String(isWaitingNextPage)}</div>
      <div>hasNextPage: {String(hasNextPage)}</div>
      <div className="pb-6">
        error: {(error as any)?.status || '-'} {(error as any)?.statusText}
      </div>

      <button
        className="btn"
        onClick={() => {
          fetchNextPage().then((state) => {
            console.log('Yay', state);
          });
        }}
      >
        Fetch Next Page
      </button>
    </>
  );
}
