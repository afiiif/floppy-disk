import { createQuery } from '../../src';
import { fetchFloppyDiskRepo } from './api';

const useFloppyDiskRepoQuery = createQuery(fetchFloppyDiskRepo);

export default function WithoutParam() {
  const { isLoading, data } = useFloppyDiskRepoQuery();

  if (isLoading) return <div>Loading...</div>;
  if (data) return <WithoutParamContent />;
  return <div>Error!</div>;
}

function WithoutParamContent() {
  const { data } = useFloppyDiskRepoQuery();

  return (
    <div>
      <h3 className="text-lg font-semibold text-rose-500">{data!.full_name}</h3>
      <div className="my-2">{data!.description}</div>
      <a
        href={data!.html_url}
        target="_blank"
        rel="noreferrer"
        className="text-rose-400 hover:underline"
      >
        {data!.html_url}
      </a>
    </div>
  );
}
