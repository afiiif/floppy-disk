import { createStores } from "floppy-disk/react";
import { useState } from "react";

import type { Route } from "./+types/home";

import { CardWithRenderCounter } from "~/card";

export function meta({}: Route.MetaArgs) {
  return [{ title: "FloppyDisk.ts Stores" }];
}

// ---

type StoreState = {
  foo: number;
  bar: number;
  baz: { a: { b: { c: number } } };
};

const myStore = createStores<StoreState, { id: number }>(
  {
    foo: 1,
    bar: 2,
    baz: { a: { b: { c: 3 } } },
  },
  {
    onSubscribe: (_state, { key, keyHash }) => {
      console.log(
        `🟦 ${keyHash} Subscriber added`,
        `(total subs: ${myStore(key).getSubscriberCount()})`,
      );
    },
    onUnsubscribe: (_state, { key, keyHash }) => {
      console.log(
        `🟨 ${keyHash} Subscriber removed`,
        `(total subs: ${myStore(key).getSubscriberCount()})`,
      );
    },
  },
);

const myStoreActions = {
  incrementFoo: (id: number) => {
    myStore({ id }).setState((p) => ({ foo: p.foo + 1 }));
  },
  incrementBar: (id: number) => {
    myStore({ id }).setState((p) => ({ bar: p.bar + 1 }));
  },
  doubleBaz: (id: number) => {
    myStore({ id }).setState((p) => ({ baz: { a: { b: { c: p.baz.a.b.c * 2 } } } }));
  },
  resetAll: (id: number) =>
    myStore({ id }).setState({
      foo: 1,
      bar: 2,
      baz: { a: { b: { c: 3 } } },
    }),
};

// ---

export default function Example() {
  const [id, setId] = useState(3);
  return (
    <>
      <div className="flex items-center gap-4">
        <button
          type="button"
          className="btn"
          onClick={() => setId((p) => p - 1)}
          disabled={id <= 1}
        >
          {"<"}
        </button>
        <div>ID: {id}</div>
        <button type="button" className="btn" onClick={() => setId((p) => p + 1)}>
          {">"}
        </button>
      </div>
      <StoreConsumer1 id={id} />
      <StoreConsumer2 id={id} />
      <StoreConsumer3 id={id} />
      <StoreConsumer4 id={id} />
      <ConditionalElements id={id} />
      <Controls id={id} />
    </>
  );
}

function StoreConsumer1({ id }: { id: number }) {
  const useMyStore = myStore({ id });
  const state = useMyStore();
  return (
    <CardWithRenderCounter>
      <div>Whole state:</div>
      <pre>{JSON.stringify(state, null, 2)}</pre>
    </CardWithRenderCounter>
  );
}

function StoreConsumer2({ id }: { id: number }) {
  const useMyStore = myStore({ id });
  const state = useMyStore();
  return (
    <CardWithRenderCounter>
      <div>foo: {state.foo}</div>
    </CardWithRenderCounter>
  );
}

function StoreConsumer3({ id }: { id: number }) {
  const useMyStore = myStore({ id });
  const { bar } = useMyStore();
  return (
    <CardWithRenderCounter>
      <div>bar: {bar}</div>
    </CardWithRenderCounter>
  );
}

function StoreConsumer4({ id }: { id: number }) {
  const useMyStore = myStore({ id });
  const { baz } = useMyStore();
  return (
    <CardWithRenderCounter>
      <div>baz.a.b.c: {baz.a.b.c}</div>
    </CardWithRenderCounter>
  );
}

function ConditionalElements({ id }: { id: number }) {
  const [show, setShow] = useState(false);
  return (
    <CardWithRenderCounter>
      <div className="flex items-center gap-4">
        <button type="button" className="btn" onClick={() => setShow((p) => !p)}>
          Toggle Element
        </button>
        <div className="text-xs">Check console for store events</div>
      </div>
      {show && (
        <>
          <StoreConsumer2 id={id} />
          <StoreConsumer3 id={id} />
        </>
      )}
    </CardWithRenderCounter>
  );
}

function Controls({ id }: { id: number }) {
  return (
    <CardWithRenderCounter className="button-container flex flex-wrap gap-4">
      <button type="button" onClick={() => myStoreActions.incrementFoo(id)}>
        Increment foo
      </button>
      <button type="button" onClick={() => myStoreActions.incrementBar(id)}>
        Increment bar
      </button>
      <button type="button" onClick={() => myStoreActions.doubleBaz(id)}>
        Double baz
      </button>
      <button type="button" onClick={() => myStoreActions.resetAll(id)}>
        Reset all
      </button>
    </CardWithRenderCounter>
  );
}
