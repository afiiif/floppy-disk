import { ComponentChildren, createContext } from 'preact';
import { useContext, useState } from 'preact/hooks';

export const withContext = <T,>(initFn: () => T) => {
  const Context = createContext<T | null>(null);

  const Provider = ({
    children,
    onInitialize,
  }: {
    children: ComponentChildren;
    onInitialize?: (value: T) => void;
  }) => {
    const [value] = useState(() => {
      const store = initFn();
      onInitialize && onInitialize(store);
      return store;
    });
    // @ts-ignore
    return <Context.Provider value={value}>{children}</Context.Provider>;
  };

  const useCurrentContext = () => useContext(Context);

  return [Provider, useCurrentContext] as const;
};
