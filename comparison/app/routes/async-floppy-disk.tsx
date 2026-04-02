import { createMutation, createQuery, useMutation } from "floppy-disk/react";
import { useState } from "react";

import { CardWithReRenderHighlight, Tabs } from "~/shared/components";
import { basicQueryFn2, infQueryFn2, keyedQueryFn2, mutationFn2 } from "~/shared/utils";

export function meta() {
  return [
    { title: "FloppyDisk.ts for Async State Management" },
    { name: "description", content: "FloppyDisk.ts for async state management" },
  ];
}

export default function AsyncStateFloppyDisk() {
  return (
    <>
      <h1 className="font-bold pb-4">FloppyDisk.ts for Async State Management</h1>
      <Tabs
        menu={[
          {
            label: "Single Query",
            content: <MyQuery />,
          },
          {
            label: "Keyed Query",
            content: <KeyedQueryContainer />,
          },
          {
            label: "Infinite Query",
            content: <ExampleInfiniteQuery />,
          },
          {
            label: "Mutation",
            content: <ExampleMutation />,
          },
        ]}
      />
    </>
  );
}

// ---

function MyQuery() {
  return (
    <>
      <MyQueryState />
      <MyQueryData />
      <MyQueryDataSlice />
      <MyQueryActions />
    </>
  );
}

const myQuery = createQuery(basicQueryFn2, {
  staleTime: 4000,
});
const useMyQuery = myQuery();

function MyQueryState() {
  const queryState = useMyQuery();
  return (
    <CardWithReRenderHighlight>
      <h2>queryState</h2>
      <pre className="text-xs">{JSON.stringify(queryState, null, 2)}</pre>
    </CardWithReRenderHighlight>
  );
}

function MyQueryData() {
  const queryState = useMyQuery();
  return (
    <CardWithReRenderHighlight>
      <h2>queryState.data</h2>
      <pre className="text-xs">{JSON.stringify(queryState.data, null, 2) || "undefined"}</pre>
    </CardWithReRenderHighlight>
  );
}
function MyQueryDataSlice() {
  const queryState = useMyQuery();
  return (
    <CardWithReRenderHighlight>
      <h2>queryState.data?.b</h2>
      <pre className="text-xs">{JSON.stringify(queryState.data?.b) || "undefined"}</pre>
    </CardWithReRenderHighlight>
  );
}

function MyQueryActions() {
  return (
    <CardWithReRenderHighlight className="flex gap-3">
      <button onClick={() => useMyQuery.execute()}>Refetch</button>
      <button onClick={() => useMyQuery.invalidate()}>Invalidate</button>
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
          {"<"}
        </button>
        <div>id: {id}</div>
        <button onClick={() => setId((p) => p + 1)}>{">"}</button>
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
        queryState.data?.b with <span className="inline-block">{"{ keepPreviousData: true }"}</span>
      </h3>
      <pre className="text-xs">{JSON.stringify(queryState.data?.b) || "undefined"}</pre>
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

function ExampleInfiniteQuery() {
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

  if (state === "INITIAL") {
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
            style={{ writingMode: "vertical-lr" }}
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
          <div style={{ writingMode: "vertical-lr" }} className="sticky top-20 sm:top-14">
            Cursor:{" "}
            {cursor ? (
              <span className="text-sky-500">{cursor}</span>
            ) : (
              <span className="opacity-50">undefined</span>
            )}{" "}
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

// ---

const useMyGlobalMutation = createMutation(mutationFn2, {
  onSuccess: (data) => console.info("🌏 Hello from onSuccess option (outside component)", data),
});

function ExampleMutation() {
  return (
    <>
      <h2 className="pb-1">Global state</h2>
      <div className="pb-3.5 opacity-50 text-xs">
        {"const myGlobalMutation = createMutation(...)"}
      </div>
      <ExampleMutationGlobal />
      <ExampleMutationGlobal />
      <GlobalMutationControl />

      <h2 className="pt-5 pb-1">Local state</h2>
      <div className="pb-3.5 opacity-50 text-xs">
        {"const [result, { execute }] = useMutation(...)"}
      </div>
      <ExampleMutationLocal />
      <ExampleMutationLocal />
    </>
  );
}

function ExampleMutationGlobal() {
  const result = useMyGlobalMutation();
  return (
    <CardWithReRenderHighlight>
      <h2>Global</h2>
      <pre className={result.isError ? "text-red-400" : undefined}>
        {JSON.stringify(result, null, 2)}
      </pre>
    </CardWithReRenderHighlight>
  );
}
function GlobalMutationControl() {
  const { isPending } = useMyGlobalMutation();
  return (
    <CardWithReRenderHighlight>
      <h2>Mutate Global</h2>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            useMyGlobalMutation.execute({ foo: 7 }).then((result) => {
              console.log("🌏 Hello from awaited promise", result);
            });
          }}
        >
          Input: {"{ foo: 7 }"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            useMyGlobalMutation.execute({ foo: 33, bar: "test" }).then((result) => {
              console.log("🌏 Hello from awaited promise", result);
            });
          }}
        >
          Input: {'{ foo: 33, bar: "test" }'}
        </button>
      </div>
    </CardWithReRenderHighlight>
  );
}

function ExampleMutationLocal() {
  const [result, { execute }] = useMutation(mutationFn2, {
    onSuccess: (data) => console.info("🏠 Hello from onSuccess option", data),
  });
  return (
    <CardWithReRenderHighlight>
      <h2>Local</h2>
      <pre className={result.isError ? "text-red-400" : undefined}>
        {JSON.stringify(result, null, 2)}
      </pre>
      <hr className="border-dashed mt-3" />
      <div className="pt-3 pb-2">Mutate:</div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={result.isPending}
          onClick={() => {
            execute({ foo: 7 }).then((result) => {
              console.log("🏠 Hello from awaited promise", result);
            });
          }}
        >
          Input: {"{ foo: 7 }"}
        </button>
        <button
          type="button"
          disabled={result.isPending}
          onClick={() => {
            execute({ foo: 33, bar: "test" }).then((result) => {
              console.log("🏠 Hello from awaited promise", result);
            });
          }}
        >
          Input: {'{ foo: 33, bar: "test" }'}
        </button>
      </div>
    </CardWithReRenderHighlight>
  );
}
