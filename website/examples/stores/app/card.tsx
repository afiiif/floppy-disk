import { useEffect, useRef, type ReactNode } from "react";

const initialRenderCount = process.env.NODE_ENV === "development" ? -1 : 0;

export function CardWithRenderCounter({
  children,
  className = "",
}: {
  children?: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null!);

  const renderCount = useRef(initialRenderCount);
  useEffect(() => {
    renderCount.current++;
    const elm = ref.current;
    elm.classList.remove("animate-render");
    if (renderCount.current > 1) {
      void elm.offsetWidth; // force reflow
      elm.classList.add("animate-render");
    }
  });

  return (
    <div ref={ref} className={`relative border p-4 [&:not(:first-child)]:mt-5 ${className}`}>
      <div className="bg-mist-400 text-primary-bg absolute right-0 top-0 px-1.5 text-sm">
        {Math.max(0, renderCount.current)}
      </div>
      {children}
    </div>
  );
}
