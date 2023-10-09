import { createBiDirectionQuery } from '../../src';

type Res = { data: any[]; previousId: number | null; nextId: number | null };
const fetchProjects = async (cursor: number): Promise<Res> => {
  const res = await fetch(`/api/projects?cursor=${cursor}`);
  const resJson = await res.json();
  if (res.ok) return resJson;
  throw resJson;
};

const useProjectsQuery = createBiDirectionQuery<undefined, Res, any[]>(
  (_queryKey, { pageParam }, direction) => fetchProjects(pageParam || 0),
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
    <div>
      <h1>Bi-Direction Infinite Query</h1>
      <button
        className="btn"
        onClick={() => {
          console.log(useProjectsQuery.get().prev);
          console.info(useProjectsQuery.get().next);
        }}
      >
        Log
      </button>
      <hr />
      <button className="btn" onClick={fetchPrevPage}>
        Prev {isWaitingPrevPage && '⏳'}
      </button>
      <ul>
        {data.map((item) => (
          <li key={item.id}>{JSON.stringify(item)}</li>
        ))}
      </ul>
      <button className="btn" onClick={fetchNextPage}>
        Next {isWaitingNextPage && '⏳'}
      </button>
    </div>
  );
}
