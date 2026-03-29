import { createStore } from 'floppy-disk/react';

import { CardWithReRenderHighlight } from './_shared';

export function meta() {
  return [
    { title: 'FloppyDisk.JS Store' },
    { name: 'description', content: 'FloppyDisk.JS store' },
  ];
}

const useMyStore = createStore({
  foo: 0,
  bar: 'lorem-ipsum',
});

useMyStore.subscribe((state) => console.info('State updated', state));

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
      <h2>{'useMyStore()'}</h2>
      <pre>{JSON.stringify(value)}</pre>
    </CardWithReRenderHighlight>
  );
}

function StoreStateConsumer2() {
  const value = useMyStore((state) => state.foo);
  return (
    <CardWithReRenderHighlight>
      <h2>{'useMyStore(state => state.foo)'}</h2>
      <pre>{JSON.stringify(value)}</pre>
    </CardWithReRenderHighlight>
  );
}

function StoreStateConsumer3() {
  const value = useMyStore((state) => state.bar);
  return (
    <CardWithReRenderHighlight>
      <h2>{'useMyStore(state => state.bar)'}</h2>
      <pre>{JSON.stringify(value)}</pre>
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
