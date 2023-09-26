'use client';

import { createBiDirectionQuery } from 'floppy-disk';

const fetchProjects = async (cursor) => {
  const res = await fetch(`/api/projects?cursor=${cursor}`);
  const resJson = await res.json();
  if (res.ok) return resJson;
  throw resJson;
};

const useProjectsQuery = createBiDirectionQuery(
  (queryKey, { pageParam }, direction) => fetchProjects(pageParam || 0),
  {
    select: (response, { data = [] }, direction) => {
      return direction === 'prev' ? response.data.concat(data) : data.concat(response.data);
    },
    getPrevPageParam: (response) => response.previousId,
    getNextPageParam: (response) => response.nextId,
  },
);

export default function BiDirectionPage() {
  const {
    data,
    fetchPrevPage,
    hasPrevPage,
    isWaitingPrevPage,
    fetchNextPage,
    hasNextPage,
    isWaitingNextPage,
  } = useProjectsQuery();

  return (
    <main>
      <h1>Bi-Direction Infinite Query</h1>
      <button
        onClick={() => {
          console.log(useProjectsQuery.get());
        }}
      >
        Check on console log
      </button>
      <hr />
      <button onClick={fetchPrevPage}>
        Prev {isWaitingPrevPage && '⏳'}
        {!hasPrevPage && '🔴'}
      </button>
      <ul>
        {data.map((item) => (
          <li key={item.id}>{JSON.stringify(item)}</li>
        ))}
      </ul>
      <button onClick={fetchNextPage}>
        Next {isWaitingNextPage && '⏳'}
        {!hasNextPage && '🔴'}
      </button>
    </main>
  );
}
