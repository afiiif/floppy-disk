import { ReactNode } from "react";
import Link from "next/link";

import { cn } from "@/utils/string";

export default function Banner({ children }: { children: ReactNode }) {
  return (
    <div
      className={cn(
        "relative -mx-6 -mt-4 md:-mx-12",
        "border-b border-b-gray-200 dark:border-b-gray-800",
        "overflow-hidden text-center",
      )}
    >
      <div className="bg-[radial-gradient(var(--tw-gradient-stops))] from-white dark:from-black/70">
        <span className="mx-auto block max-w-6xl px-6 py-24 md:px-12 xl:py-20">
          <h1
            className={cn(
              "text-4xl font-extrabold sm:text-5xl xl:text-6xl",
              "bg-clip-text text-transparent",
              "bg-gradient-to-b from-zinc-700 to-zinc-900",
              "dark:from-white dark:from-40% dark:to-gray-400",
              "selection:bg-black/70 selection:text-white dark:selection:bg-white/70 dark:selection:text-black",
            )}
          >
            <div>Sync + Async</div>
            <div>State Management.</div>
            One Mental Model.
          </h1>
          <div className="pt-4 italic opacity-70 sm:pt-5 sm:text-lg xl:pt-7 xl:text-xl">
            <div>
              {"Built on the patterns you know. "}
              <span className="block sm:inline-block">Refined into something simpler.</span>
            </div>
            <div>
              Fine-grained reactivity, minimal boilerplate,{" "}
              <span className="block sm:inline-block">zero dependencies.</span>
            </div>
          </div>

          <div
            className={cn(
              "relative flex flex-col justify-center gap-4 sm:flex-row sm:items-center",
              "pt-16 sm:pt-11 md:pb-5",
            )}
          >
            <div
              className={cn(
                "rounded-md bg-white dark:bg-[rgba(17,17,17,var(--tw-bg-opacity))] sm:w-52 sm:text-left",
                "[&_pre+div]:opacity-100 [&_pre+div_.nextra-button:first-child]:hidden [&_pre]:mb-0 [&_pre]:rounded-md [&_pre]:py-3.5",
              )}
            >
              {children}
            </div>
            <Link className="btn py-3" href="/docs/getting-started">
              Get Started
            </Link>
          </div>
        </span>
      </div>

      <div
        className={cn(
          "absolute -top-1 sm:-top-1 md:-top-2.5 xl:-top-1",
          "z-[-1] h-[calc(100%_+_32px)] w-[calc(100%_+_32px)] translate-x-0 bg-grid",
        )}
      />
      <style jsx>
        {`
          .animate-trigger:hover > :global(.animate-shake) {
            animation: tilt-n-move-shaking 0.15s infinite;
            opacity: 80%;
          }
          @keyframes tilt-n-move-shaking {
            0% { transform: translate(0, 0) rotate(0deg); }
            25% { transform: translate(2px, 2px) rotate(0.5deg); }
            50% { transform: translate(0, 0) rotate(0eg); }
            75% { transform: translate(-2px, 2px) rotate(-0.5deg); }
            100% { transform: translate(0, 0) rotate(0deg); }
          }
          .bg-grid {
            animation: grid-moving 1s infinite linear;
          }
          @keyframes grid-moving {
            0% { transform: translate(0, 0); }
            100% { transform: translate(-32px, 0); }
          }
        `}
      </style>
    </div>
  );
}
