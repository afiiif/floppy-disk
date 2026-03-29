export function meta() {
  return [
    { title: 'FloppyDisk.js Comparison' },
    { name: 'description', content: 'FloppyDisk.js comparison with Zustand & TanStack-Query' },
  ];
}

export default function Home() {
  return (
    <div className="leading-[20px]">
      <p className="pb-6">
        I built a library that <strong>could replace</strong> Zustand and TanStack-Query.{' '}
        <span className="inline-block">Bold claim, I know.</span> Let's see if it actually delivers.
      </p>

      <section className="text-[11px] sm:text-[13px] leading-[15px] sm:leading-[18px] border p-3 rounded overflow-x-auto">
        <div className="whitespace-pre min-w-[467px] space-y-1">
          <div>{'vite v7.3.1 building client environment for production...'}</div>
          <div>{'✓ 102 modules transformed.'}</div>
          <div>{'  /.vite/manifest.json                     3.06 kB │ gzip:  0.57 kB'}</div>
          <div>{'  /assets/root-DzJSMdzf.css               12.18 kB │ gzip:  3.13 kB'}</div>
          <div>{'  /assets/_shared-DIQD5OPT.js              0.96 kB │ gzip:  0.49 kB'}</div>
          <div>{'  /assets/store-floppy-disk-Cpy3fbLt.js    1.12 kB │ gzip:  0.51 kB 🎉'}</div>
          <div className="bg-green-500/10">
            {'  /assets/store-zustand-BAlSrnWn.js        1.67 kB │ gzip:  0.79 kB'}
          </div>
          <div className="bg-orange-500/15">
            {'  /assets/root-DiAsNG2A.js                 2.34 kB │ gzip:  0.95 kB'}
          </div>
          <div>{'  /assets/home-B7LxdS1e.js                 2.61 kB │ gzip:  1.07 kB'}</div>
          <div className="bg-green-500/10">
            {'  /assets/async-floppy-disk-BvXV4dzh.js    2.79 kB │ gzip:  0.94 kB 🎉'}
          </div>
          <div>{'  /assets/react-C7xYuR75.js                7.15 kB │ gzip:  2.71 kB'}</div>
          <div className="bg-orange-500/15">
            {'  /assets/async-tanstack-DHT6RKp7.js      36.42 kB │ gzip: 10.87 kB'}
          </div>
          <div>{'  /assets/chunk-UVKPFVEO-BARWKRxW.js     125.42 kB │ gzip: 42.24 kB'}</div>
          <div>{'  /assets/entry.client-j5N2nWy6.js       190.57 kB │ gzip: 60.05 kB'}</div>
          <div>{'✓ built in 690ms'}</div>
        </div>
      </section>

      <p className="pt-6 text-pretty">
        This site focuses on comparing bundle size while demonstrating equivalent functionality.
      </p>

      <div className="pt-4">You can find the code here:</div>
      <a className="link" href="https://github.com/afiiif/floppy-disk/tree/beta/comparison">
        github.com/afiiif/floppy-disk/tree/beta/comparison
      </a>

      {/*
      <div className="pt-4">Documentation is available here:</div>
      <a href="#" className="opacity-50">
        TODO: Update docs link
      </a>
      */}
    </div>
  );
}
