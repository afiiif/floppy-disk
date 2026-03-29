import { useEffect, useRef, type ReactNode } from 'react';

export function CardWithReRenderHighlight({
  children,
  className = '',
}: {
  children: ReactNode;
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
