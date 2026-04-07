import { useCallback, useRef, useState } from "react";
import { noop } from "../vanilla.ts";
import { INITIAL_STATE, type MutationOptions, type MutationState } from "./create-mutation.ts";

/**
 * A hook for managing async mutation state.
 *
 * @param mutationFn - Async function that performs the mutation.
 * Receives the input variable and the state snapshot before execution.
 *
 * @param options - Optional lifecycle callbacks:
 * - `onSuccess(data, variable, stateBeforeExecute)`
 * - `onError(error, variable, stateBeforeExecute)`
 * - `onSettled(variable, stateBeforeExecute)`
 *
 * @returns A tuple containing:
 * - state: The current mutation state (render snapshot)
 * - controls: An object with mutation actions and helpers
 *
 * @remarks
 * - No retry mechanism is provided by default.
 * - The mutation always resolves (never throws): the result contains either `data` or `error`.
 * - If multiple executions triggered at the same time:
 *   - Only the latest execution is allowed to update the state.
 *   - Results from previous executions are ignored if a newer one exists.
 *
 * @see https://floppy-disk.vercel.app/docs/mutation
 */
export const useMutation = <TData, TVariable = undefined, TError = Error>(
  /**
   * Async function that performs the mutation.
   *
   * @remarks
   * - Does NOT need to be memoized (e.g. `useCallback`).
   * - The latest function reference is always used internally.
   */
  mutationFn: (
    variable: TVariable,
    stateBeforeExecute: MutationState<TData, TVariable, TError>,
  ) => Promise<TData>,

  /**
   * Optional lifecycle callbacks.
   *
   * @remarks
   * - Callbacks do NOT need to be memoized.
   * - The latest callbacks are always used internally.
   */
  options: MutationOptions<TData, TVariable, TError> = {},
) => {
  type TState = MutationState<TData, TVariable, TError>;
  type PromiseResult = { variable: TVariable; data?: TData; error?: TError };
  type ResolveFn = (result: PromiseResult | PromiseLike<PromiseResult>) => void;

  type Execute = TVariable extends undefined
    ? () => Promise<{ variable: undefined; data?: TData; error?: TError }>
    : (variable: TVariable) => Promise<{ variable: TVariable; data?: TData; error?: TError }>;

  const { onSuccess = noop, onError, onSettled = noop } = options;

  const callbackRef = useRef({ onSuccess, onError, onSettled });
  callbackRef.current.onSuccess = onSuccess;
  callbackRef.current.onError = onError;
  callbackRef.current.onSettled = onSettled;

  const stateRef = useRef<TState>({ ...INITIAL_STATE } as TState);
  const [, reRender] = useState({});

  const refs = useRef({
    mutationFn,
    ongoingPromise: undefined as Promise<PromiseResult> | undefined,
    resolveFns: new Set<ResolveFn>(),
  });
  refs.current.mutationFn = mutationFn;

  const execute = useCallback((variable: TVariable) => {
    let currentResolveFn: ResolveFn;

    const stateBeforeExecute = stateRef.current;
    if (stateBeforeExecute.isPending) {
      console.warn(
        "A mutation was executed while a previous execution is still pending. " +
          "The previous execution will be ignored (latest execution wins).",
      );
    }
    stateRef.current.isPending = true;
    reRender({});

    const promise = new Promise<{ variable: TVariable; data?: TData; error?: TError }>(
      (resolve) => {
        currentResolveFn = resolve;
        refs.current
          .mutationFn(variable, stateBeforeExecute)
          .then((data) => {
            if (promise !== refs.current.ongoingPromise) {
              return resolve({ data, variable });
            }

            stateRef.current = {
              state: "SUCCESS",
              isPending: false,
              isSuccess: true,
              isError: false,
              variable,
              data,
              dataUpdatedAt: Date.now(),
              error: undefined,
              errorUpdatedAt: undefined,
            };
            reRender({});
            resolve({ data, variable });
            refs.current.resolveFns.clear();
            callbackRef.current.onSuccess(data, variable, stateBeforeExecute);
          })
          .catch((error) => {
            if (promise !== refs.current.ongoingPromise) {
              return resolve({ error, variable });
            }

            stateRef.current = {
              state: "ERROR",
              isPending: false,
              isSuccess: false,
              isError: true,
              variable,
              data: undefined,
              dataUpdatedAt: undefined,
              error,
              errorUpdatedAt: Date.now(),
            };
            reRender({});
            resolve({ error, variable });
            refs.current.resolveFns.clear();
            if (callbackRef.current.onError) {
              callbackRef.current.onError(error, variable, stateBeforeExecute);
            } else {
              console.error(stateRef.current);
            }
          })
          .finally(() => {
            if (promise !== refs.current.ongoingPromise) return;
            callbackRef.current.onSettled(variable, stateBeforeExecute);
            refs.current.ongoingPromise = undefined;
          });
      },
    );

    if (refs.current.ongoingPromise) {
      refs.current.resolveFns.forEach((resolveFn) => resolveFn(promise));
    }
    refs.current.resolveFns.add(currentResolveFn!);
    refs.current.ongoingPromise = promise;

    return promise;
  }, []);

  const reset = useCallback(() => {
    if (stateRef.current.isPending) {
      console.warn(
        "Mutation state was reset while a request is still pending. The request will continue, but its result may override the reset state.",
      );
    }
    stateRef.current = { ...INITIAL_STATE } as TState;
    reRender({});
  }, []);

  const r: [
    TState,
    {
      /**
       * Executes the mutation.
       *
       * @param variable - Input passed to the mutation function
       *
       * @returns A promise that always resolves with:
       * - `{ data, variable }` on success
       * - `{ error, variable }` on failure
       *
       * @remarks
       * - The promise never rejects to simplify async handling.
       * - If a mutation is already in progress, a warning is logged.
       * - When a new execution starts, all previous pending executions will resolve with the result of the latest execution.
       */
      execute: Execute;

      /**
       * Resets the mutation state back to its initial state.
       *
       * @remarks
       * - Does not cancel any ongoing execution.
       * - If an execution is still pending, its result may override the reset state.
       */
      reset: typeof reset;

      /**
       * Returns the latest mutation state directly from the internal ref.
       *
       * @returns The most up-to-date mutation state.
       *
       * @remarks
       * - Unlike the `state` returned by the hook, this value is not tied to React render cycles.
       * - Use this inside async flows or event handlers to avoid stale reads.
       */
      getLatestState: () => TState;
    },
  ] = [
    stateRef.current,
    {
      execute: execute as Execute,
      reset,
      getLatestState: () => stateRef.current,
    },
  ];
  return r;
};
