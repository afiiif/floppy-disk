import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router";

const initialRenderCount = process.env.NODE_ENV === "development" ? -1 : 0;

export function CardWithReRenderHighlight({
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
    <div ref={ref} className={`card ${className}`}>
      <div className="card-badge">{Math.max(0, renderCount.current)}</div>
      {children}
    </div>
  );
}

export function Tabs({
  menu,
  urlParamKey = "activeTab",
}: {
  menu: Array<{ label: string; content: ReactNode }>;
  urlParamKey?: string;
}) {
  const [_searchParams, setSearchParams] = useSearchParams();

  const [tabIndex, setTabIndex] = useState(-1);

  useLayoutEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialActiveTab = params.get(urlParamKey);
    if (initialActiveTab) {
      const initialTabIndex = menu.findIndex((item) => item.label === initialActiveTab);
      if (initialTabIndex) setTabIndex(Number(initialTabIndex));
    } else setTabIndex(0);
  }, [urlParamKey]);

  return (
    <>
      <nav className="tabs">
        {menu.map((menuItem, i) => (
          <button
            key={menuItem.label}
            type="button"
            aria-current={tabIndex === i || undefined}
            onClick={() => {
              setTabIndex(i);
              const url = new URL(window.location.href);
              setSearchParams(i ? { [urlParamKey]: menuItem.label } : {});
              window.history.replaceState({}, "", url);
            }}
          >
            {menuItem.label}
          </button>
        ))}
      </nav>
      {tabIndex >= 0 && menu[tabIndex].content}
    </>
  );
}
