import Head from 'next/head';

export default function HomePage() {
  return (
    <>
      <Head>
        <title>Zustand & React-Query</title>
        <meta property="og:title" content="Zustand & React-Query" key="title" />
      </Head>
      <h1 className="h1">Result</h1>

      <div>
        Bundle Analyzer Result:{' '}
        <a href="/analyze/client.html" className="text-red-500 underline">
          /analyze/client.html
        </a>
      </div>

      <pre className="text-sm border rounded-lg p-4 overflow-auto mt-6">
        {`Route (pages)                              Size     First Load JS
┌ ○ /                                      931 B          87.6 kB
├   /_app                                  0 B            86.7 kB
├ ○ /404                                   182 B          86.9 kB
├ ○ /infinite-query                        1.28 kB        91.8 kB
├ ● /infinite-query-ssg                    1.78 kB        92.3 kB
├ ○ /mutation                              2.2 kB         88.9 kB
├ ○ /single-query                          1.11 kB        91.6 kB
└ ○ /store                                 2.02 kB        88.7 kB
+ First Load JS shared by all              89.4 kB
  ├ chunks/framework-63157d71ad419e09.js   45.2 kB
  ├ chunks/main-14b4672be0fd158b.js        28.6 kB
  ├ chunks/pages/_app-93c76d6ca9704ee6.js  12.2 kB
  ├ chunks/webpack-8fa1640cc84ba8fe.js     750 B
  └ css/c5826c88912daf80.css               2.7 kB`}
      </pre>

      <a
        className="inline-block mt-8 text-red-500 underline"
        href="https://github.com/afiiif/floppy-disk/tree/comparison/comparison/nextjs"
        target="_blank"
        rel="noreferrer"
      >
        https://github.com/afiiif/floppy-disk/tree/comparison/comparison/nextjs
      </a>
    </>
  );
}
