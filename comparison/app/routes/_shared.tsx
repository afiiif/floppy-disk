import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

export function CardWithReRenderHighlight({
  children,
  className = '',
}: {
  children?: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null!);

  const renderCount = useRef(-1);
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

// ---

export const basicQueryFn1 = async () => {
  console.info('[tanstack]', 'basicQueryFn called');
  await new Promise((r) => setTimeout(r, 2000));
  return {
    a: Math.random(),
    b: { value: 'always-same' },
  };
};
export const basicQueryFn2 = async () => {
  console.info('[floppy-disk]', 'basicQueryFn called');
  await new Promise((r) => setTimeout(r, 2000));
  return {
    a: Math.random(),
    b: { value: 'always-same' },
  };
};

export const keyedQueryFn1 = async ({ id }: { id: number }) => {
  console.info('[tanstack]', 'keyedQueryFn called', `id: ${id}`);
  await new Promise((r) => setTimeout(r, 2000));
  if (id === 3) {
    throw new Error('Boom!');
  }
  return {
    a: Math.random(),
    b: { id, value: 'always-same' },
  };
};
export const keyedQueryFn2 = async ({ id }: { id: number }) => {
  console.info('[floppy-disk]', 'keyedQueryFn called', `id: ${id}`);
  await new Promise((r) => setTimeout(r, 2000));
  if (id === 3) {
    throw new Error('Boom!');
  }
  return {
    a: Math.random(),
    b: { id, value: 'always-same' },
  };
};

// ---

const randomString = (length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

export const infQueryFn1 = async ({ cursor }: { cursor?: string }) => {
  console.info('[tanstack]', 'infQueryFn called', `cursor: ${cursor}`);
  await new Promise((r) => setTimeout(r, 2000));
  return {
    data: [...Array(10).keys()].map((i) => ({
      id: `${randomString()}${cursor ? `-${cursor}` : ''}-${i}`,
      foo: Math.random(),
      bar: Math.random() < 0.5,
    })),
    meta: {
      currentCursor: cursor,
      nextCursor: randomString(),
    },
  };
};
export const infQueryFn2 = async ({ cursor }: { cursor?: string }) => {
  console.info('[floppy-disk]', 'infQueryFn called', `cursor: ${cursor}`);
  await new Promise((r) => setTimeout(r, 2000));
  return {
    data: [...Array(10).keys()].map((i) => ({
      id: `${randomString()}${cursor ? `-${cursor}` : ''}-${i}`,
      foo: Math.random(),
      bar: Math.random() < 0.5,
    })),
    meta: {
      currentCursor: cursor,
      nextCursor: randomString(),
    },
  };
};
