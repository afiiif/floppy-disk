import { useState } from "react";
import { createStore } from "floppy-disk/react";

import type { Route } from "./+types/home";

import { CardWithRenderCounter } from "~/card";

export function meta({}: Route.MetaArgs) {
  return [{ title: "FloppyDisk.ts Store" }];
}

// ---

const useMyStore = createStore(
  {
    foo: 1,
    bar: 2,
    baz: { a: { b: { c: 3 } } },
  },
  {
    onSubscribe: () => {
      console.log("🟦 Subscriber added", `(total subs: ${useMyStore.getSubscriberCount()})`);
    },
    onUnsubscribe: () => {
      console.log("🟨 Subscriber removed", `(total subs: ${useMyStore.getSubscriberCount()})`);
    },
  },
);

const myStoreActions = {
  incrementFoo: () => {
    useMyStore.setState((p) => ({ foo: p.foo + 1 }));
  },
  incrementBar: () => {
    useMyStore.setState((p) => ({ bar: p.bar + 1 }));
  },
  doubleBaz: () => {
    useMyStore.setState((p) => ({ baz: { a: { b: { c: p.baz.a.b.c * 2 } } } }));
  },
  resetAll: () =>
    useMyStore.setState({
      foo: 1,
      bar: 2,
      baz: { a: { b: { c: 3 } } },
    }),
};

// ---

export default function Example() {
  return (
    <>
      <StoreConsumer1 />
      <StoreConsumer2 />
      <StoreConsumer3 />
      <StoreConsumer4 />
      <ConditionalElements />
      <Controls />
    </>
  );
}

function StoreConsumer1() {
  const state = useMyStore();
  return (
    <CardWithRenderCounter>
      <div>Whole state:</div>
      <pre>{JSON.stringify(state, null, 2)}</pre>
    </CardWithRenderCounter>
  );
}

function StoreConsumer2() {
  const state = useMyStore();
  return (
    <CardWithRenderCounter>
      <div>foo: {state.foo}</div>
    </CardWithRenderCounter>
  );
}

function StoreConsumer3() {
  const { bar } = useMyStore();
  return (
    <CardWithRenderCounter>
      <div>bar: {bar}</div>
    </CardWithRenderCounter>
  );
}

function StoreConsumer4() {
  const { baz } = useMyStore();
  return (
    <CardWithRenderCounter>
      <div>baz.a.b.c: {baz.a.b.c}</div>
    </CardWithRenderCounter>
  );
}

function ConditionalElements() {
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
          <StoreConsumer2 />
          <StoreConsumer3 />
        </>
      )}
    </CardWithRenderCounter>
  );
}

function Controls() {
  return (
    <CardWithRenderCounter className="button-container flex flex-wrap gap-4">
      <button type="button" onClick={myStoreActions.incrementFoo}>
        Increment foo
      </button>
      <button type="button" onClick={myStoreActions.incrementBar}>
        Increment bar
      </button>
      <button type="button" onClick={myStoreActions.doubleBaz}>
        Double baz
      </button>
      <button type="button" onClick={myStoreActions.resetAll}>
        Reset all
      </button>
    </CardWithRenderCounter>
  );
}
