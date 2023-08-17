import Head from 'next/head';

export default function HomePage() {
  return (
    <>
      <Head>
        <title>Floppy Disk</title>
        <meta property="og:title" content="Floppy Disk" key="title" />
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
┌ ○ /                                      921 B          79.8 kB
├   /_app                                  0 B            78.9 kB
├ ○ /404                                   182 B          79.1 kB
├ ○ /infinite-query                        2.71 kB        81.6 kB
├ ● /infinite-query-ssg (1037 ms)          3.23 kB        82.1 kB
├ ○ /mutation                              1.41 kB        80.3 kB
├ ○ /single-query                          2.95 kB        81.9 kB
└ ○ /store                                 1.19 kB        80.1 kB
+ First Load JS shared by all              81.6 kB
  ├ chunks/framework-63157d71ad419e09.js   45.2 kB
  ├ chunks/main-14b4672be0fd158b.js        28.6 kB
  ├ chunks/pages/_app-935d021cfba340a3.js  4.38 kB
  ├ chunks/webpack-8fa1640cc84ba8fe.js     750 B
  └ css/c5826c88912daf80.css               2.7 kB`}
      </pre>

      <a
        className="inline-block mt-8 text-red-500 underline"
        href="https://github.com/afiiif/floppy-disk/tree/main/comparison/nextjs"
        target="_blank"
        rel="noreferrer"
      >
        https://github.com/afiiif/floppy-disk/tree/main/comparison/nextjs
      </a>
    </>
  );
}
