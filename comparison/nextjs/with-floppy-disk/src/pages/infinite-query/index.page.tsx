import { createQuery } from 'floppy-disk';
import { SearchRepoResponse, fetchRepos } from './api';
import Head from 'next/head';

const keyword = 'chocobo language:javascript';

const useRepositoriesInfQuery = createQuery<
  undefined,
  SearchRepoResponse,
  { id: number; name: string; full_name: string; description: string; html_url: string }[]
>((_, { pageParam = 1 }) => fetchRepos({ q: keyword, page: pageParam }), {
  select: (response, { data }) => [...(data || []), ...response.items],
  getNextPageParam: (lastPageResponse, i) => {
    const totalPages = Math.ceil(lastPageResponse.total_count / 10);
    if (i < totalPages) return i + 1;
  },
});

export default function InfiniteQueryPage() {
  const { data, fetchNextPage, isWaitingNextPage, hasNextPage, error } = useRepositoriesInfQuery();

  return (
    <>
      <Head>
        <title>Infinite Query | Zustand & React-Query</title>
        <meta property="og:title" content="Infinite Query | Zustand & React-Query" key="title" />
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

      <button className="btn" onClick={() => fetchNextPage()}>
        Fetch Next Page
      </button>
    </>
  );
}
