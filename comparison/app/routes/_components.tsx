import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

const initialRenderCount = process.env.NODE_ENV === 'development' ? -1 : 0;

export function CardWithReRenderHighlight({
  children,
  className = '',
}: {
  children?: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null!);

  const renderCount = useRef(initialRenderCount);
  useEffect(() => {
    renderCount.current++;
    const elm = ref.current;
    elm.classList.remove('animate-render');
    if (renderCount.current > 1) {
      void elm.offsetWidth; // force reflow
      elm.classList.add('animate-render');
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
  storageId,
}: {
  menu: Array<{ label: string; content: ReactNode }>;
  storageId: string;
}) {
  const [tabIndex, setTabIndex] = useState(-1);
  useLayoutEffect(() => {
    const storedIndex = sessionStorage.getItem(storageId);
    if (storedIndex) setTabIndex(Number(storedIndex));
    else setTabIndex(0);
  }, [storageId]);

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
              sessionStorage.setItem(storageId, String(i));
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
