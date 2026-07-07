import Link from "next/link";

import { cn } from "@/utils/string";

const comparisonResult = `
✓ 103 modules transformed.
  /.vite/manifest.json                     3.23 kB │ gzip:  0.60 kB
  /assets/root-DS469DaY.css               15.33 kB │ gzip:  3.74 kB
  /assets/components-DrxDq1-G.js           1.01 kB │ gzip:  0.59 kB
  /assets/store-floppy-disk-D634Gohp.js    1.13 kB │ gzip:  0.52 kB 🎉
  /assets/store-zustand-BJYVMYXp.js        1.68 kB │ gzip:  0.79 kB
  /assets/utils-DpvILWFZ.js                1.95 kB │ gzip:  0.60 kB
  /assets/root-CB2-KCWF.js                 2.48 kB │ gzip:  1.01 kB
  /assets/home-DkCzTYiQ.js                 2.81 kB │ gzip:  1.19 kB
  /assets/async-floppy-disk-C1Jq5CIc.js    7.15 kB │ gzip:  1.99 kB 🎉
  /assets/react-BaGhX6Iy.js               11.44 kB │ gzip:  3.87 kB
  /assets/async-tanstack-Bqi-YPia.js      43.94 kB │ gzip: 12.62 kB
  /assets/chunk-UVKPFVEO-BCVTWmlK.js     126.29 kB │ gzip: 42.59 kB
  /assets/entry.client-CMKBzKJ-.js       190.57 kB │ gzip: 60.05 kB
✓ built in 715ms
`
  .split("\n")
  .filter(Boolean);

export default function Comparison() {
  return (
    <>
      <div
        className={cn(
          "mx-auto -mt-8 max-w-xl sm:max-w-[540px]",
          "font-mono text-[10px] leading-[13px] sm:text-[12px] sm:leading-[16px]",
          "overflow-x-auto rounded-md border p-3",
          "relative bg-blue-50 dark:bg-zinc-900",
        )}
      >
        <div className="min-w-[467px] space-y-1 whitespace-pre">
          {comparisonResult.map((line, i) => {
            let className: string | undefined = undefined;
            if (line.includes("floppy-disk")) {
              className = "bg-green-400/30 text-green-900 dark:bg-green-500/10 dark:text-green-300";
            } else if (line.includes("zustand") || line.includes("tanstack")) {
              className =
                "bg-orange-400/20 text-orange-900 dark:bg-orange-500/15 dark:text-orange-400";
            }
            return (
              <div key={i} className={className}>
                {line}
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex flex-col justify-center gap-4 pt-4 sm:flex-row">
        <Link
          className="btn w-full text-center sm:w-auto"
          href="https://afiiif.github.io/floppy-disk/"
          target="_blank"
        >
          Live Demo
        </Link>
        <Link className="btn btn-secondary w-full text-center sm:w-auto" href="/docs/comparison">
          Deep Dive Comparison
        </Link>
      </div>
    </>
  );
}
