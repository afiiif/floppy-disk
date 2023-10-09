import { createQuery } from '../../src';
import { fetchFloppyDiskRepo } from './api';

export const useFloppyDiskRepoQuery = createQuery(fetchFloppyDiskRepo);

export function Loading() {
  console.info('Without param, loading');
  return <div>Loading...</div>;
}

export function Success() {
  console.info('Without param, success');
  const data = useFloppyDiskRepoQuery().data!;
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
