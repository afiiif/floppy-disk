import { useEffect, useRef, type ReactNode } from 'react';

export function CardWithReRenderHighlight({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  const renderCount = useRef(-1);
  useEffect(() => {
    renderCount.current++;
  });

  return (
    <div
      className={`card ${renderCount.current >= 1 ? 'animate-render' : ''} ${className}`}
      key={Date.now()}
    >
      <div className="card-badge">{Math.max(0, renderCount.current)}</div>
      {children}
    </div>
  );
}
