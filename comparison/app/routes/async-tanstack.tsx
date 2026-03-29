import {
  keepPreviousData,
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query';
import { useState } from 'react';

import { basicQueryFn1, CardWithReRenderHighlight, keyedQueryFn2, Tabs } from './_shared';

export function meta() {
  return [
    { title: 'TanStack-Query for Async State Management' },
    { name: 'description', content: 'TanStack-Query for async state management' },
  ];
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 4000 },
  },
});

export default function AsyncStateTanstack() {
  return (
    <QueryClientProvider client={queryClient}>
      <h1 className="font-bold pb-4">TanStack-Query for Async State Management</h1>
      <Tabs
        storageId="TanStackTab"
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
            content: <div>Infinite Query</div>,
          },
          {
            label: 'Mutation',
            content: <div>Mutation</div>,
          },
        ]}
      />
    </QueryClientProvider>
  );
}

// ---

const useBasicQuery = (
  options?: any, // Too lazy to do type gymnastic
) =>
  useQuery({
    queryKey: ['basic'],
    queryFn: basicQueryFn1,
    ...options,
  });

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
  const queryState = useBasicQuery({ select: (data: any) => data.b });
  return (
    <CardWithReRenderHighlight>
      <h2>
        queryState.data <span className="inline-block">{'with { select: data => data.b }'}</span>
      </h2>
      <pre className="text-xs">{JSON.stringify(queryState.data) || 'undefined'}</pre>
    </CardWithReRenderHighlight>
  );
}

function SimpleQueryActions() {
  const { refetch } = useBasicQuery();
  return (
    <CardWithReRenderHighlight className="flex gap-3">
      <button onClick={() => refetch()}>Refetch</button>
      <button onClick={() => queryClient.invalidateQueries({ queryKey: ['basic'] })}>
        Invalidate
      </button>
    </CardWithReRenderHighlight>
  );
}

// ---

const useKeyedQuery = (
  id: number,
  options?: any, // Too lazy to do type gymnastic
) =>
  useQuery({
    queryKey: ['keyed', id],
    queryFn: () => keyedQueryFn2({ id }),
    staleTime: 15_000,
    ...options,
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
  const queryState = useKeyedQuery(id);
  return (
    <CardWithReRenderHighlight>
      <h3>{'queryState'}</h3>
      <pre className="text-xs">{JSON.stringify(queryState, null, 2)}</pre>
    </CardWithReRenderHighlight>
  );
}
function KeyedQueryDataSlice({ id }: { id: number }) {
  const queryState = useKeyedQuery(id, { placeholderData: keepPreviousData });
  const errMsg = queryState.error?.message;
  return (
    <CardWithReRenderHighlight>
      <h3>
        queryState.data?.b with{' '}
        <span className="inline-block">{'{ placeholderData: keepPreviousData }'}</span>
      </h3>
      <pre className="text-xs">{JSON.stringify((queryState.data as any)?.b) || 'undefined'}</pre>
      {errMsg && (
        <pre className="text-xs opacity-50 pt-1">(error.message: {JSON.stringify(errMsg)})</pre>
      )}
    </CardWithReRenderHighlight>
  );
}
function KeyedQueryActions({ id }: { id: number }) {
  const { refetch } = useKeyedQuery(id);
  return (
    <CardWithReRenderHighlight className="flex gap-3 !mb-0">
      <button onClick={() => queryClient.invalidateQueries({ queryKey: ['keyed', id] })}>
        Invalidate
      </button>
      <button onClick={() => queryClient.invalidateQueries({ queryKey: ['keyed'] })}>
        Invalidate all ids
      </button>
    </CardWithReRenderHighlight>
  );
}
