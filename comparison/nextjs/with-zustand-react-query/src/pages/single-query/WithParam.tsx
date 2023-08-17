import { useQuery } from '@tanstack/react-query';
import { fetchBundlephobia } from './api';

const useBundlephobiaQuery = (packageName: string) =>
  useQuery(['bundlephobia', packageName], () => fetchBundlephobia(packageName), {
    enabled: !!packageName,
  });

export default function WithParam({ packageName }: { packageName: string }) {
  const { isLoading, data } = useBundlephobiaQuery(packageName);

  if (!packageName) return <div>Select a package 👆</div>;
  if (isLoading) return <div>Loading...</div>;
  if (data) return <WithParamContent packageName={packageName} />;
  return <div>Error!</div>;
}

function WithParamContent({ packageName }: { packageName: string }) {
  const { data } = useBundlephobiaQuery(packageName);

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
