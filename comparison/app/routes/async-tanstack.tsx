import {
  keepPreviousData,
  QueryClient,
  QueryClientProvider,
  useInfiniteQuery,
  useMutation,
  useMutationState,
  useQuery,
} from '@tanstack/react-query';
import { useState } from 'react';

import { CardWithReRenderHighlight, Tabs } from '../shared/components';
import { basicQueryFn1, infQueryFn1, keyedQueryFn2, mutationFn1 } from '../shared/utils';

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
            content: <ExampleInfiniteQuery />,
          },
          {
            label: 'Mutation',
            content: <ExampleMutation />,
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
  useQuery<Awaited<ReturnType<typeof basicQueryFn1>>>({
    ...options,
    queryKey: ['basic'],
    queryFn: basicQueryFn1,
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
  const queryState = useBasicQuery();
  return (
    <CardWithReRenderHighlight>
      <h2>queryState.data?.b</h2>
      <pre className="text-xs">{JSON.stringify(queryState.data?.b) || 'undefined'}</pre>
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
  useQuery<Awaited<ReturnType<typeof keyedQueryFn2>>>({
    ...options,
    queryKey: ['keyed', id],
    queryFn: () => keyedQueryFn2({ id }),
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

// ---

function ExampleInfiniteQuery() {
  const queryState = useInfiniteQuery({
    queryKey: ['inf-query'],
    queryFn: ({ pageParam }) => infQueryFn1({ cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage, pages) => lastPage.meta.nextCursor,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const cursors = (queryState.data?.pageParams as Array<string | undefined>) || [];

  const lastData = queryState.data?.pages.at(-1);
  const nextCursor = lastData?.meta.nextCursor;

  return (
    <>
      {queryState.data?.pages.map((group, i) => (
        <div key={i} className="flex gap-5">
          <div className="flex-1">
            {group.data.map((item) => (
              <CardWithReRenderHighlight key={item.id}>
                <pre className="text-xs">{JSON.stringify(item, null, 2)}</pre>
              </CardWithReRenderHighlight>
            ))}
          </div>
          <div className="w-5 relative pb-12">
            <div style={{ writingMode: 'vertical-lr' }} className="sticky top-20 sm:top-14">
              Cursor:{' '}
              {cursors[i] ? (
                <span className="text-sky-500">{cursors[i]}</span>
              ) : (
                <span className="opacity-50">undefined</span>
              )}{' '}
              →
            </div>
          </div>
        </div>
      ))}

      {queryState.isLoading || queryState.isFetchingNextPage ? (
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
              Cursor: {nextCursor || <span className="opacity-50">undefined</span>}
            </div>
          </div>
        </div>
      ) : (
        queryState.hasNextPage && (
          <div className="flex gap-4 items-center">
            <button type="button" onClick={() => queryState.fetchNextPage()}>
              Load more
            </button>
            <div className="text-xs">Next cursor: {nextCursor}</div>
          </div>
        )
      )}
    </>
  );
}

// ---

function ExampleMutation() {
  return (
    <>
      <h2 className="pb-1">Global state</h2>
      <div className="pb-3.5 opacity-50 text-xs">{'useMutation with mutationKey'}</div>
      <ExampleMutationGlobal />
      <ExampleMutationGlobal />
      <GlobalMutationControl />

      <h2 className="pt-5 pb-1">Local state</h2>
      <div className="pb-3.5 opacity-50 text-xs">{'useMutation without mutationKey'}</div>
      <ExampleMutationLocal />
      <ExampleMutationLocal />
    </>
  );
}

function ExampleMutationGlobal() {
  const mutations = useMutationState({
    filters: { mutationKey: ['my-global-mutation'] },
  });
  const latestMutation = mutations.at(-1);
  return (
    <CardWithReRenderHighlight>
      <h2>Global (useMutationState)</h2>
      <pre className={latestMutation?.error ? 'text-red-400' : undefined}>
        {JSON.stringify(latestMutation, null, 2) || 'undefined'}
      </pre>
    </CardWithReRenderHighlight>
  );
}
function GlobalMutationControl() {
  const { isPending, mutate } = useMutation({
    mutationKey: ['my-global-mutation'],
    mutationFn: mutationFn1,
  });
  return (
    <CardWithReRenderHighlight>
      <h2>Mutate Global</h2>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            mutate(
              { foo: 7 },
              { onSettled: (...result) => console.log('🌏 Hello from awaited promise', result) },
            );
          }}
        >
          Input: {'{ foo: 7 }'}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            mutate(
              { foo: 33, bar: 'test' },
              { onSettled: (...result) => console.log('🌏 Hello from awaited promise', result) },
            );
          }}
        >
          Input: {'{ foo: 33, bar: "test" }'}
        </button>
      </div>
    </CardWithReRenderHighlight>
  );
}

function ExampleMutationLocal() {
  const mutation = useMutation({ mutationFn: mutationFn1 });
  return (
    <CardWithReRenderHighlight>
      <h2>Local</h2>
      <pre className={mutation.isError ? 'text-red-400' : undefined}>
        {JSON.stringify(mutation, null, 2)}
      </pre>
      <hr className="border-dashed mt-3" />
      <div className="pt-3 pb-2">Mutate:</div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={mutation.isPending}
          onClick={() => {
            mutation.mutate(
              { foo: 7 },
              { onSettled: (...result) => console.log('🏠 Hello from awaited promise', result) },
            );
          }}
        >
          Input: {'{ foo: 7 }'}
        </button>
        <button
          type="button"
          disabled={mutation.isPending}
          onClick={() => {
            mutation.mutate(
              { foo: 33, bar: 'test' },
              { onSettled: (...result) => console.log('🏠 Hello from awaited promise', result) },
            );
          }}
        >
          Input: {'{ foo: 33, bar: "test" }'}
        </button>
      </div>
    </CardWithReRenderHighlight>
  );
}
