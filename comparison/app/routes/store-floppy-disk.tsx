import { createStore } from "floppy-disk/react";

import { CardWithReRenderHighlight } from "../shared/components";

export function meta() {
  return [
    { title: "FloppyDisk.ts Store" },
    { name: "description", content: "FloppyDisk.ts store" },
  ];
}

const useMyStore = createStore({
  foo: 0,
  bar: "lorem-ipsum",
});

useMyStore.subscribe((state) => console.info("State updated", state));

export default function StoreFloppyDisk() {
  return (
    <>
      <h1 className="font-bold pb-5">FloppyDisk's Store</h1>
      <StoreStateConsumer1 />
      <StoreStateConsumer2 />
      <StoreStateConsumer3 />
      <StoreStateMutator />
    </>
  );
}

function StoreStateConsumer1() {
  const value = useMyStore();
  return (
    <CardWithReRenderHighlight>
      <h2>{"const value = useMyStore()"}</h2>
      <pre>{JSON.stringify(value, null, 2)}</pre>
    </CardWithReRenderHighlight>
  );
}

function StoreStateConsumer2() {
  const { foo } = useMyStore();
  return (
    <CardWithReRenderHighlight>
      <h2>{"const { foo } = useMyStore()"}</h2>
      <pre>{JSON.stringify(foo)}</pre>
    </CardWithReRenderHighlight>
  );
}

function StoreStateConsumer3() {
  const { bar } = useMyStore();
  return (
    <CardWithReRenderHighlight>
      <h2>{"const { bar } = useMyStore()"}</h2>
      <pre>{JSON.stringify(bar)}</pre>
    </CardWithReRenderHighlight>
  );
}

function StoreStateMutator() {
  return (
    <button
      type="button"
      onClick={() => {
        useMyStore.setState((p) => ({ foo: p.foo + 1 }));
      }}
    >
      Increment foo
    </button>
  );
}
