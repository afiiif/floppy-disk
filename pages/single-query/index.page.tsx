import Head from 'next/head';
import { useState } from 'react';

import WithoutParam from './WithoutParam';
import WithParam from './WithParam';

export default function SingleQueryPage() {
  const [packageName, setPackageName] = useState('');

  return (
    <>
      <Head>
        <title>Single Query</title>
        <meta property="og:title" content="Single Query" key="title" />
      </Head>
      <h1 className="h1">Single Query</h1>

      <h2 className="h2 border-b">Without Param</h2>
      <WithoutParam />

      <h2 className="h2 border-b">With Param</h2>
      <div className="flex gap-2 flex-wrap pb-4">
        <button onClick={() => setPackageName('zustand')} className="btn">
          zustand
        </button>
        <button onClick={() => setPackageName('@tanstack/react-query')} className="btn">
          @tanstack/react-query
        </button>
        <button onClick={() => setPackageName('floppy-disk')} className="btn">
          floppy-disk
        </button>
      </div>
      <WithParam packageName={packageName} />
    </>
  );
}
