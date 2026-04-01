export function meta() {
  return [
    { title: 'FloppyDisk.ts Comparison' },
    { name: 'description', content: 'FloppyDisk.ts comparison with Zustand & TanStack-Query' },
  ];
}

const buildOutput = `✓ 103 modules transformed.
build/client/.vite/manifest.json                     3.23 kB │ gzip:  0.61 kB
build/client/a____s/root-DS469DaY.css               15.33 kB │ gzip:  3.74 kB
build/client/a____s/components-CApVxW6A.js           0.84 kB │ gzip:  0.49 kB
build/client/a____s/store-floppy-disk-DAYYhG7a.js    1.13 kB │ gzip:  0.52 kB
build/client/a____s/store-zustand-CwKqIspR.js        1.68 kB │ gzip:  0.79 kB
build/client/a____s/utils-B9M1Z8Ow.js                1.73 kB │ gzip:  0.59 kB
build/client/a____s/root-BxCThUSF.js                 2.39 kB │ gzip:  0.97 kB
build/client/a____s/home-B6mulJUQ.js                 2.80 kB │ gzip:  1.19 kB
build/client/a____s/async-floppy-disk-Zn4dzzTI.js    7.14 kB │ gzip:  2.01 kB
build/client/a____s/react-B_GsbzAT.js               10.80 kB │ gzip:  3.64 kB
build/client/a____s/async-tanstack-DYPYDTxr.js      43.93 kB │ gzip: 12.63 kB
build/client/a____s/chunk-UVKPFVEO-BARWKRxW.js     125.42 kB │ gzip: 42.24 kB
build/client/a____s/entry.client-j5N2nWy6.js       190.57 kB │ gzip: 60.05 kB
✓ built in 715ms`.split('\n');

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
                {line.replace('____s', 'ssets').replace('build/client', '  ')}
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

      <div className="pt-5">You can find the code here:</div>
      <a className="link" href="https://github.com/afiiif/floppy-disk/tree/beta/comparison">
        github.com/afiiif/floppy-disk/tree/beta/comparison
      </a>

      <div className="pt-5">Documentation is available here:</div>
      <a className="link" href="https://github.com/afiiif/floppy-disk/tree/beta#readme">
        github.com/afiiif/floppy-disk/tree/beta#readme
      </a>
    </div>
  );
}
