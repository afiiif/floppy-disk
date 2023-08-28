import { render } from 'preact';

import { createStore } from 'floppy-disk';

function App() {
  return (
    <main>
      <h1>💾 Floppy Disk - Store - Watch component</h1>

      <CatControl />
      <hr />
      <ComponentA />
      <hr />
      <ComponentB />
    </main>
  );
}

const useCatStore = createStore(({ set }) => ({
  age: 0,
  isSleeping: false,
  increaseAge: () => set((prev) => ({ age: prev.age + 1 })),
  toggleIsSleeping: () => set((prev) => ({ isSleeping: !prev.isSleeping })),
}));

function ComponentA() {
  console.log('This component is re-rendered');
  const { age } = useCatStore((state) => [state.age]);
  return (
    <section>
      <AnotherComponent />
      <p>Cat's age: {age}</p>
      <AnotherComponent />
    </section>
  );
}

function ComponentB() {
  console.log('This component is re-rendered');
  return (
    <section>
      <AnotherComponent />
      <useCatStore.Watch
        render={(state) => <p>Cat's age: {state.age}</p>}
        selectDeps={(state) => [state.age]}
      />
      <AnotherComponent />
    </section>
  );
}

function AnotherComponent() {
  return <div>Another Component</div>;
}

function CatControl() {
  const { increaseAge, toggleIsSleeping } = useCatStore(() => []);
  return (
    <>
      <button onClick={increaseAge}>Increase cat's age</button>
      <button onClick={toggleIsSleeping}>Toggle isSleeping</button>
    </>
  );
}

render(<App />, document.getElementById('app'));
