import { render } from 'preact';

import { createQuery } from 'floppy-disk';

const useGitHubQuery = createQuery(async () => {
  const res = await fetch('https://api.github.com/repos/afiiif/floppy-disk', { cache: 'no-store' });
  if (res.ok) return res.json();
  throw res;
});

function App() {
  const { isLoading, fetch, forceFetch } = useGitHubQuery();

  return (
    <main>
      <h1>💾 Floppy Disk - Query</h1>

      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <>
          <Info />
          <License />
        </>
      )}

      <hr />
      <section>
        <button onClick={fetch}>Call query if the query data is stale</button>
        <button onClick={forceFetch}>Call query</button>
      </section>
    </main>
  );
}

function Info() {
  const { data } = useGitHubQuery();
  return (
    <ul>
      <li>ID: {data.id}</li>
      <li>Name: {data.name}</li>
      <li>Description: {data.description}</li>
    </ul>
  );
}

function License() {
  const { data } = useGitHubQuery();
  return (
    <div>
      License: {data.license.name} ({data.license.url})
    </div>
  );
}

render(<App />, document.getElementById('app'));
