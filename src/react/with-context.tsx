import React, { createContext, ReactNode, useContext, useState } from 'react';

export const withContext = <T,>(initFn: () => T) => {
  const Context = createContext<T | null>(null);

  const Provider = ({
    children,
    onInitialize,
  }: {
    children: ReactNode;
    onInitialize?: (value: T) => void;
  }) => {
    const [value] = useState(() => {
      const store = initFn();
      onInitialize && onInitialize(store);
      return store;
    });
    return <Context.Provider value={value}>{children}</Context.Provider>;
  };

  const useCurrentContext = () => useContext(Context);

  return [Provider, useCurrentContext] as const;
};
