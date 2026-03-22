import { useEffect, useLayoutEffect } from 'react';
import { isClient } from '../vanilla.ts';

/**
 * Does exactly same as `useLayoutEffect`.\
 * It will use `useEffect` in **server-side** to prevent warning when executed on server-side.
 */
export const useIsomorphicLayoutEffect = isClient ? useLayoutEffect : useEffect;
