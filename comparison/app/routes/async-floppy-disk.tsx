import { createQuery } from 'floppy-disk/react';
import { useState } from 'react';

import { basicQueryFn2, infQueryFn2, keyedQueryFn2 } from './_utils';
import { CardWithReRenderHighlight, Tabs } from './_components';

export function meta() {
  return [
    { title: 'FloppyDisk.js for Async State Management' },
    { name: 'description', content: 'FloppyDisk.js for async state management' },
  ];
}

export default function AsyncStateFloppyDisk() {
  return (
    <>
      <h1 className="font-bold pb-4">FloppyDisk.js for Async State Management</h1>
      <Tabs
        storageId="FloppyDiskTab"
        menu={[
          {
            label: 'Single Query',
            content: (
              <>
                <SimpleQueryState />
                <SimpleQueryData />
                <SimpleQueryDataSlice />
                <SimpleQueryActions />
              </>
            ),
          },
          {
            label: 'Keyed Query',
            content: <KeyedQueryContainer />,
          },
          {
            label: 'Infinite Query',
            content: <InfiniteQuery />,
          },
          {
            label: 'Mutation',
            content: <div>Mutation</div>,
          },
        ]}
      />
    </>
  );
}

// ---

const basicQuery = createQuery(basicQueryFn2, {
  staleTime: 4000,
});
const useBasicQuery = basicQuery();

function SimpleQueryState() {
  const queryState = useBasicQuery();
  return (
    <CardWithReRenderHighlight>
      <h2>queryState</h2>
      <pre className="text-xs">{JSON.stringify(queryState, null, 2)}</pre>
    </CardWithReRenderHighlight>
  );
}

function SimpleQueryData() {
  const queryState = useBasicQuery();
  return (
    <CardWithReRenderHighlight>
      <h2>queryState.data</h2>
      <pre className="text-xs">{JSON.stringify(queryState.data, null, 2) || 'undefined'}</pre>
    </CardWithReRenderHighlight>
  );
}
function SimpleQueryDataSlice() {
  const queryState = useBasicQuery();
  return (
    <CardWithReRenderHighlight>
      <h2>queryState.data?.b</h2>
      <pre className="text-xs">{JSON.stringify(queryState.data?.b) || 'undefined'}</pre>
    </CardWithReRenderHighlight>
  );
}

function SimpleQueryActions() {
  return (
    <CardWithReRenderHighlight className="flex gap-3">
      <button onClick={() => useBasicQuery.execute()}>Refetch</button>
      <button onClick={() => useBasicQuery.invalidate()}>Invalidate</button>
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
      <h3>queryState</h3>
      <pre className="text-xs">{JSON.stringify(queryState, null, 2)}</pre>
    </CardWithReRenderHighlight>
  );
}
function KeyedQueryDataSlice({ id }: { id: number }) {
  const useKeyedQuery = keyedQuery({ id });
  const queryState = useKeyedQuery({ keepPreviousData: true });
  const errMsg = queryState.error?.message;
  return (
    <CardWithReRenderHighlight>
      <h3>
        queryState.data?.b with <span className="inline-block">{'{ keepPreviousData: true }'}</span>
      </h3>
      <pre className="text-xs">{JSON.stringify(queryState.data?.b) || 'undefined'}</pre>
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

// ---

const infQuery = createQuery(infQueryFn2, {
  staleTime: Infinity,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
});

function InfiniteQuery() {
  return (
    <>
      <Page />

      <div className="bg-[#21252b] border-t fixed z-20 bottom-0 -ml-4 px-4 sm:-ml-6 sm:px-6 py-3 w-full max-w-2xl flex justify-end">
        <button
          type="button"
          onClick={() => {
            infQuery.resetAll();
            infQuery({ cursor: undefined }).execute();
          }}
        >
          Start over
        </button>
      </div>
    </>
  );
}

function Page({ cursor }: { cursor?: string }) {
  const useQuery = infQuery({ cursor });
  const { state, data, error } = useQuery();

  if (state === 'INITIAL') {
    return (
      <div className="flex gap-5">
        <div className="flex-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card h-24 space-y-2.5">
              <div className="rounded bg-mist-700 animate-pulse h-3 w-28"></div>
              <div className="rounded bg-mist-700 animate-pulse h-3 w-32"></div>
              <div className="rounded bg-mist-700 animate-pulse h-3 w-16"></div>
            </div>
          ))}
        </div>
        <div className="w-5 relative">
          <div
            style={{ writingMode: 'vertical-lr' }}
            className="sticky top-20 sm:top-14 animate-pulse"
          >
            Cursor: {cursor || <span className="opacity-50">undefined</span>}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <>
        <div className="pb-4">Something went wrong!</div>
        <button type="button" onClick={() => useQuery.execute()}>
          Retry
        </button>
      </>
    );
  }

  return (
    <>
      <div className="flex gap-5">
        <div className="flex-1">
          {data.data.map((item) => (
            <CardWithReRenderHighlight key={item.id}>
              <pre className="text-xs">{JSON.stringify(item, null, 2)}</pre>
            </CardWithReRenderHighlight>
          ))}
        </div>
        <div className="w-5 relative pb-12">
          <div style={{ writingMode: 'vertical-lr' }} className="sticky top-20 sm:top-14">
            Cursor:{' '}
            {cursor ? (
              <span className="text-sky-500">{cursor}</span>
            ) : (
              <span className="opacity-50">undefined</span>
            )}{' '}
            →
          </div>
        </div>
      </div>

      {!!data.meta.nextCursor && <LoadMoreButton nextCursor={data.meta.nextCursor} />}
    </>
  );
}

function LoadMoreButton({ nextCursor }: { nextCursor?: string }) {
  const [isLoadMoreClicked, setIsLoadMoreClicked] = useState(() => {
    const state = infQuery({ cursor: nextCursor }).getState();
    return state.isPending || state.isSuccess;
  });
  if (isLoadMoreClicked) return <Page cursor={nextCursor} />;
  return (
    <div className="flex gap-4 items-center">
      <button type="button" onClick={() => setIsLoadMoreClicked(true)}>
        Load more
      </button>
      <div className="text-xs">Next cursor: {nextCursor}</div>
    </div>
  );
}
