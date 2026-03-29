import { useState } from 'react';
import { createQuery } from 'floppy-disk/react';

import { basicQueryFn2, CardWithReRenderHighlight, keyedQueryFn2 } from './_shared';

export function meta() {
  return [
    { title: 'FloppyDisk.js for Async State Management' },
    { name: 'description', content: 'FloppyDisk.js for async state management' },
  ];
}

export default function AsyncStateFloppyDisk() {
  return (
    <>
      <h1 className="font-bold pb-5">FloppyDisk.js for Async State Management</h1>
      <SimpleQueryState />
      <SimpleQueryData />
      <SimpleQueryDataSlice />
      <SimpleQueryActions />

      <h2 className="pt-6 pb-4">Keyed Query (staleTime: 15s)</h2>
      <KeyedQueryContainer />
    </>
  );
}

// ---

const basicQuery = createQuery(basicQueryFn2, {
  staleTime: 4000,
});
const useQuery = basicQuery();

function SimpleQueryState() {
  const queryState = useQuery();
  return (
    <CardWithReRenderHighlight>
      <h2>{'const queryState = useQuery()'}</h2>
      <pre className="text-xs">{JSON.stringify(queryState, null, 2)}</pre>
    </CardWithReRenderHighlight>
  );
}

function SimpleQueryData() {
  const data = useQuery({}, (state) => state.data);
  return (
    <CardWithReRenderHighlight>
      <h2>{'const data = useQuery({}, (state) => state.data)'}</h2>
      <pre className="text-xs">{JSON.stringify(data, null, 2) || 'undefined'}</pre>
    </CardWithReRenderHighlight>
  );
}
function SimpleQueryDataSlice() {
  const b = useQuery({}, (state) => state.data?.b);
  return (
    <CardWithReRenderHighlight>
      <h2>{'const b = useQuery({}, (state) => state.data?.b)'}</h2>
      <pre className="text-xs">{JSON.stringify(b) || 'undefined'}</pre>
    </CardWithReRenderHighlight>
  );
}

function SimpleQueryActions() {
  return (
    <CardWithReRenderHighlight className="flex gap-3">
      <button onClick={() => useQuery.execute()}>Refetch</button>
      <button onClick={() => useQuery.invalidate()}>Invalidate</button>
    </CardWithReRenderHighlight>
  );
}

// ---

type Res = {
  a: number;
  b: { id: number; value: string };
};
const keyedQuery = createQuery<Res, { id: number }>(keyedQueryFn2, {
  staleTime: 15_000,
});

function KeyedQueryContainer() {
  const [id, setId] = useState(1);
  return (
    <CardWithReRenderHighlight>
      <div className="flex gap-3 pb-4 items-center">
        <button onClick={() => setId((p) => p - 1)} disabled={!id}>
          {'<'}
        </button>
        <div>id: {id}</div>
        <button onClick={() => setId((p) => p + 1)}>{'>'}</button>
        {id === 3 && <div className="text-rose-400 text-xs">Will simulate error</div>}
      </div>
      <KeyedQueryState id={id} />
      <KeyedQueryDataSlice id={id} />
      <KeyedQueryActions id={id} />
    </CardWithReRenderHighlight>
  );
}
function KeyedQueryState({ id }: { id: number }) {
  const useKeyedQuery = keyedQuery({ id });
  const queryState = useKeyedQuery();
  return (
    <CardWithReRenderHighlight>
      <h3>{'queryState'}</h3>
      <pre className="text-xs">{JSON.stringify(queryState, null, 2)}</pre>
    </CardWithReRenderHighlight>
  );
}
function KeyedQueryDataSlice({ id }: { id: number }) {
  const useKeyedQuery = keyedQuery({ id });
  const b = useKeyedQuery({ keepPreviousData: true }, (state) => state.data?.b);
  const errMsg = useKeyedQuery((state) => (state.error as undefined | Error)?.message);
  return (
    <CardWithReRenderHighlight>
      <h3>
        queryState.data?.b with <span className="inline-block">{'{ keepPreviousData: true }'}</span>
      </h3>
      <pre className="text-xs">{JSON.stringify(b) || 'undefined'}</pre>
      {errMsg && (
        <pre className="text-xs opacity-50 pt-1">(error.message: {JSON.stringify(errMsg)})</pre>
      )}
    </CardWithReRenderHighlight>
  );
}
function KeyedQueryActions({ id }: { id: number }) {
  const useKeyedQuery = keyedQuery({ id });
  return (
    <CardWithReRenderHighlight className="flex gap-3 !mb-0">
      <button onClick={() => useKeyedQuery.invalidate()}>Invalidate</button>
      <button onClick={() => keyedQuery.invalidateAll()}>Invalidate all ids</button>
    </CardWithReRenderHighlight>
  );
}
