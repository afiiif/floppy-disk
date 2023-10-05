import Head from 'next/head';

import { cn } from '../utils';
import { useCountStore } from './store';

export default function StorePage() {
  return (
    <>
      <Head>
        <title>Store</title>
        <meta property="og:title" content="Store" key="title" />
      </Head>
      <h1 className="h1">Store</h1>

      <div className="flex flex-wrap gap-x-6">
        <Counter />
        <div className="border border-neutral-800 rounded-lg p-2 inline-block w-36 mb-6">
          This should not get re-rendered
        </div>
        <Counter />
        <NestedComponent />
      </div>
    </>
  );
}

function Counter() {
  const { count, inc } = useCountStore();
  return (
    <section className="border border-neutral-800 rounded-lg p-2 inline-block w-36 mb-6">
      <div
        className={cn(
          'text-4xl p-3 font-extrabold text-center',
          count > 1 && 'animate-spin [animation-iteration-count:1] [animation-duration:0.25s]',
        )}
        key={count}
      >
        {count}
      </div>
      <button onClick={inc} className="btn w-full">
        One up
      </button>
    </section>
  );
}

function NestedComponent() {
  return (
    <>
      <div className="w-full" />
      <div className="border border-neutral-800 rounded-lg p-2 inline-block w-36 mb-6">
        This should not get re-rendered
      </div>
      <Counter />
    </>
  );
}
