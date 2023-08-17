import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchRepos } from './api';

const keyword = 'chocobo language:javascript';

export default function InfiniteQueryPage() {
  const { data, fetchNextPage, isFetchingNextPage, hasNextPage, error } = useInfiniteQuery({
    queryKey: ['repos', keyword],
    queryFn: ({ pageParam = 1 }) => fetchRepos({ q: keyword, page: pageParam }),
    getNextPageParam: ({ total_count }, allPages) => {
      const totalPages = Math.ceil(total_count / 10);
      if (allPages.length < totalPages) return allPages.length + 1;
    },
    retry: 0,
  });

  return (
    <>
      <h1 className="h1">Infinite Query</h1>

      <ul className="list-disc pl-7">
        {data?.pages
          .flatMap((page) => page.items)
          .map((repo) => {
            return <li key={repo.id}>{repo.full_name}</li>;
          })}
      </ul>

      <div className="pt-5">isFetchingNextPage: {String(isFetchingNextPage)}</div>
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
