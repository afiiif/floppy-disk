import { createQuery } from '../../src';
import { BundlephobiaApiResponse, fetchBundlephobia } from './api';

export const useBundlephobiaQuery = createQuery<{ packageName: string }, BundlephobiaApiResponse>(
  ({ packageName }) => fetchBundlephobia(packageName),
  {
    enabled: ({ packageName }) => !!packageName,
  },
);

function Success({ data, keyHash }: ReturnType<typeof useBundlephobiaQuery>) {
  console.log('With param, success', keyHash);

  return (
    <div>
      <h3 className="text-lg font-semibold text-rose-500">{data!.name}</h3>
      <ul className="list-disc pl-7">
        <li>Size: {data!.size}</li>
        <li>GZip: {data!.gzip}</li>
        <li>
          Dependency:
          <ul className="list-disc pl-7">
            {data!.dependencySizes.map(({ name }) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </li>
      </ul>
    </div>
  );
}

export default function WithParam({ packageName }: { packageName: string }) {
  return (
    <useBundlephobiaQuery.Render
      queryKey={{ packageName }}
      success={Success}
      error={({ keyHash }) => {
        return (
          <div>
            <h3>Error</h3>
            <pre>{JSON.stringify({ packageName, keyHash }, null, 2)}</pre>
          </div>
        );
      }}
    />
  );
}
