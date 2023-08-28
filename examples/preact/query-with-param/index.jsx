import { render } from 'preact';

import { createQuery } from 'floppy-disk';

const useBundlephobiaQuery = createQuery(
  async ({ pkgName }) => {
    const res = await fetch(`https://bundlephobia.com/api/size?package=${pkgName}`);
    if (res.ok) return res.json();
    throw res;
  },
  {
    // keepPreviousData: true,
    enabled: ({ pkgName }) => !!pkgName,
    onSuccess: (response, { key }) => {
      console.info(key, response);
    },
  },
);

const getFloppyDiskInfo = () => {
  const { isSuccess, isError, error, data } = useBundlephobiaQuery.get({ pkgName: 'floppy-disk' });
  alert(JSON.stringify({ isSuccess, isError, error, data }, null, 2));
};

function App() {
  const [pkgName, setPkgName] = useState();

  return (
    <main>
      <h1>💾 Floppy Disk - Query with Param</h1>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => setPkgName('floppy-disk')}>floppy-disk</button>
        <button onClick={() => setPkgName('zustand')}>zustand</button>
        <button onClick={() => setPkgName('@tanstack/react-query')}>@tanstack/react-query</button>
      </div>

      {pkgName ? <PackageInfo pkgName={pkgName} /> : <h2>Select a package...</h2>}

      <hr />
      <button onClick={getFloppyDiskInfo}>Get data outside component</button>
    </main>
  );
}

function PackageInfo({ pkgName }) {
  const { isLoading, data } = useBundlephobiaQuery({ pkgName });

  if (isLoading) return <div>Loading...</div>;

  if (!data) return <div>Error!</div>;

  return (
    <>
      <h2>{data.name}</h2>
      <ul>
        <li>Size: {data.size}</li>
        <li>GZip: {data.gzip}</li>
        <li>
          Dependency:
          <ul>
            {data.dependencySizes.map(({ name }) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </li>
      </ul>
    </>
  );
}

render(<App />, document.getElementById('app'));
