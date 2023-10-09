import { useState } from 'react';

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
  const { data, forceFetch } = useFloppyDiskRepoQuery();
  const [count, setCount] = useState(0);

  console.log('Rendered...');

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
      <div>
        <button
          className="btn mt-4"
          onClick={() => {
            forceFetch().then((state) => {
              console.info('Success refetch', state);
              setCount((p) => p + 1);
            });
          }}
        >
          Refetch {count}
        </button>
      </div>
    </div>
  );
}
