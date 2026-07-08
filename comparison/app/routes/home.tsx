export function meta() {
  return [
    { title: "YuuState Comparison" },
    { name: "description", content: "YuuState comparison with Zustand & TanStack-Query" },
  ];
}

// Use a____s to prevent "/assets" replacement to "/yuustate/assets" on CI
const buildOutput = `✓ 103 modules transformed.
build/client/.vite/manifest.json                  3.20 kB │ gzip:  0.60 kB
build/client/a____s/root-CRn6MgiL.css            15.45 kB │ gzip:  3.77 kB
build/client/a____s/components-DrxDq1-G.js        1.01 kB │ gzip:  0.59 kB
build/client/a____s/store-yuustate-ANnGAsrD.js    1.12 kB │ gzip:  0.51 kB
build/client/a____s/store-zustand-BJYVMYXp.js     1.68 kB │ gzip:  0.79 kB
build/client/a____s/utils-DuanyUhp.js             1.94 kB │ gzip:  0.60 kB
build/client/a____s/root-CDn2kOZF.js              2.46 kB │ gzip:  1.01 kB
build/client/a____s/home-DQiCh3EF.js              2.74 kB │ gzip:  1.18 kB
build/client/a____s/async-yuustate-DoDkgSCs.js    7.13 kB │ gzip:  1.99 kB
build/client/a____s/react-yNhF9ZRY.js            11.80 kB │ gzip:  4.02 kB
build/client/a____s/async-tanstack-Cq-pcNs-.js   43.94 kB │ gzip: 12.62 kB
build/client/a____s/chunk-UVKPFVEO-BCVTWmlK.js  126.29 kB │ gzip: 42.59 kB
build/client/a____s/entry.client-CMKBzKJ-.js    190.57 kB │ gzip: 60.05 kB
✓ built in 715ms`.split("\n");

export default function Home() {
  return (
    <div className="leading-[20px]">
      <p className="pb-6">
        I built a library that <strong>could replace</strong> Zustand and TanStack-Query.{" "}
        <span className="inline-block">Bold claim, I know.</span> Let's compare!
      </p>

      <section className="text-[11px] sm:text-[13px] leading-[15px] sm:leading-[18px] border p-3 rounded overflow-x-auto">
        <div className="whitespace-pre min-w-[467px] space-y-1">
          {buildOutput.map((line, i) => {
            let className: string | undefined = undefined;
            let emoji = "";
            if (line.includes("yuustate")) {
              className = "bg-green-500/10 text-green-300";
              emoji = " 🎉";
            } else if (line.includes("zustand") || line.includes("tanstack")) {
              className = "bg-orange-500/15 text-orange-400";
            }
            return (
              <div key={i} className={className}>
                {line.replace("____s", "ssets").replace("build/client", "  ")}
                {emoji}
              </div>
            );
          })}
        </div>
      </section>

      <p className="pt-6">
        This site focuses on comparing bundle size while demonstrating{" "}
        <span className="inline-block font-bold">equivalent functionality</span>.
      </p>

      <div className="pt-5">You can find the code here:</div>
      <a className="link" href="https://github.com/afiiif/yuustate/tree/main/comparison">
        github.com/afiiif/yuustate/tree/main/comparison
      </a>

      <div className="pt-5">Documentation is available here:</div>
      <a className="link" href="https://yuustate.vercel.app">
        yuustate.vercel.app
      </a>
    </div>
  );
}
