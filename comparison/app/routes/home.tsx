export function meta() {
  return [
    { title: 'FloppyDisk.js Comparison' },
    { name: 'description', content: 'FloppyDisk.js comparison with Zustand & TanStack-Query' },
  ];
}

const buildOutput = `✓ 102 modules transformed.
build/client/.vite/manifest.json                     3.06 kB │ gzip:  0.57 kB
build/client/assets/root-BlUsBC2T.css               14.94 kB │ gzip:  3.67 kB
build/client/assets/store-floppy-disk-D24Oocn8.js    1.12 kB │ gzip:  0.51 kB
build/client/assets/store-zustand-B6X30uYu.js        1.67 kB │ gzip:  0.79 kB
build/client/assets/_shared-IOA9G3cl.js              1.81 kB │ gzip:  0.90 kB
build/client/assets/root-DQjsmfBs.js                 2.34 kB │ gzip:  0.95 kB
build/client/assets/home-CBLbe1oo.js                 2.50 kB │ gzip:  1.13 kB
build/client/assets/async-floppy-disk--k1MDojj.js    5.17 kB │ gzip:  1.61 kB
build/client/assets/react-C7xYuR75.js                7.15 kB │ gzip:  2.71 kB
build/client/assets/async-tanstack-BycCI268.js      36.62 kB │ gzip: 10.93 kB
build/client/assets/chunk-UVKPFVEO-BARWKRxW.js     125.42 kB │ gzip: 42.24 kB
build/client/assets/entry.client-j5N2nWy6.js       190.57 kB │ gzip: 60.05 kB
✓ built in 705ms`.split('\n');

export default function Home() {
  return (
    <div className="leading-[20px]">
      <p className="pb-6">
        I built a library that <strong>could replace</strong> Zustand and TanStack-Query.{' '}
        <span className="inline-block">Bold claim, I know.</span> Let's see if it actually delivers.
      </p>

      <section className="text-[11px] sm:text-[13px] leading-[15px] sm:leading-[18px] border p-3 rounded overflow-x-auto">
        <div className="whitespace-pre min-w-[467px] space-y-1">
          {buildOutput.map((line) => {
            let className: string | undefined = undefined;
            let emoji = '';
            if (line.includes('floppy-disk')) {
              className = 'bg-green-500/10 text-green-300';
              emoji = ' 🎉';
            } else if (line.includes('zustand') || line.includes('tanstack')) {
              className = 'bg-orange-500/15 text-orange-400';
            }
            return (
              <div className={className}>
                {line.replace('build/client', '  ')}
                {emoji}
              </div>
            );
          })}
        </div>
      </section>

      <p className="pt-6">
        This site focuses on comparing bundle size while demonstrating{' '}
        <span className="inline-block font-bold">equivalent functionality</span>.
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
