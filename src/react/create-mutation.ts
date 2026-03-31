import { type InitStoreOptions, type SetState, initStore, noop } from '../vanilla.ts';
import { useStoreState } from './use-store.ts';

/**
 * Represents the state of a mutation.
 *
 * @remarks
 * A mutation does not cache results and only tracks the latest execution.
 *
 * The state transitions are:
 * - `INITIAL` → before any execution
 * - `SUCCESS` → when mutation resolves successfully
 * - `ERROR` → when mutation fails
 *
 * Unlike queries:
 * - No retry mechanism
 * - No caching across executions
 */
export type MutationState<TData, TVariable, TError> = {
  isPending: boolean;
} & (
  | {
      state: 'INITIAL';
      isSuccess: false;
      isError: false;
      variable: undefined;
      data: undefined;
      dataUpdatedAt: undefined;
      error: undefined;
      errorUpdatedAt: undefined;
    }
  | {
      state: 'SUCCESS';
      isSuccess: true;
      isError: false;
      variable: TVariable;
      data: TData;
      dataUpdatedAt: number;
      error: undefined;
      errorUpdatedAt: undefined;
    }
  | {
      state: 'ERROR';
      isSuccess: false;
      isError: true;
      variable: TVariable;
      data: undefined;
      dataUpdatedAt: undefined;
      error: TError;
      errorUpdatedAt: number;
    }
);

const INITIAL_STATE = {
  state: 'INITIAL',
  isPending: false,
  isSuccess: false,
  isError: false,
  variable: undefined,
  data: undefined,
  dataUpdatedAt: undefined,
  error: undefined,
  errorUpdatedAt: undefined,
};

/**
 * Configuration options for a mutation.
 *
 * @remarks
 * Lifecycle callbacks are triggered for each execution.
 */
export type MutationOptions<TData, TVariable, TError = Error> = InitStoreOptions<
  MutationState<TData, TVariable, TError>
> & {
  /**
   * Called when the mutation succeeds.\
   * If multiple concurrent executions happened, only the latest execution triggers this callback.
   */
  onSuccess?: (
    data: TData,
    variable: TVariable,
    stateBeforeExecute: MutationState<TData, TVariable, TError>,
  ) => void;

  /**
   * Called when the mutation fails.\
   * If multiple concurrent executions happened, only the latest execution triggers this callback.
   */
  onError?: (
    error: TError,
    variable: TVariable,
    stateBeforeExecute: MutationState<TData, TVariable, TError>,
  ) => void;

  /**
   * Called after the mutation settles (either success or error).\
   * If multiple concurrent executions happened, only the latest execution triggers this callback.
   */
  onSettled?: (
    variable: TVariable,
    stateBeforeExecute: MutationState<TData, TVariable, TError>, //
  ) => void;
};

/**
 * Creates a mutation store for handling async operations that modify data.
 *
 * @param mutationFn - Async function that performs the mutation
 * @param options - Optional configuration and lifecycle callbacks
 *
 * @returns A function that acts as both:
 * - A React hook for subscribing to mutation state
 * - A mutation controller (execute, reset, etc.)
 *
 * @remarks
 * - Mutations are **not cached** and only track the latest execution.
 * - Designed for operations that change data (e.g. create, update, delete).
 * - No retry mechanism is provided by default.
 * - The mutation always resolves (never throws): the result contains either `data` or `error`.
 * - If multiple executions triggered at the same time:
 *   - Only the latest execution is allowed to update the state.
 *   - Results from previous executions are ignored if a newer one exists.
 *
 * @example
 * const useCreateUser = createMutation(async (input) => {
 *   return api.createUser(input);
 * });
 *
 * const { isPending } = useCreateUser();
 * const result = await useCreateUser.execute({ name: 'John' });
 */
export const createMutation = <TData, TVariable = undefined, TError = Error>(
  mutationFn: (
    variable: TVariable,
    stateBeforeExecute: MutationState<TData, TVariable, TError>,
  ) => Promise<TData>,
  options: MutationOptions<TData, TVariable, TError> = {},
) => {
  const { onSuccess = noop, onError, onSettled = noop } = options;

  type TState = MutationState<TData, TVariable, TError>;
  type PromiseResult = { variable: TVariable; data?: TData; error?: TError };
  type ResolveFn = (result: PromiseResult | PromiseLike<PromiseResult>) => void;

  const initialState = INITIAL_STATE as TState;
  let ongoingPromise: Promise<PromiseResult> | undefined;
  const resolveFns = new Set<ResolveFn>([]);

  const store = initStore(initialState, options);
  const useStore = () => useStoreState(store.getState(), store.subscribe);

  const execute = (variable: TVariable) => {
    let currentResolveFn: ResolveFn;

    const stateBeforeExecute = store.getState();
    if (stateBeforeExecute.isPending) {
      console.warn(
        'A mutation was executed while a previous execution is still pending. ' +
          'The previous execution will be ignored (latest execution wins).',
      );
    }
    store.setState({ isPending: true });

    const promise = new Promise<PromiseResult>((resolve) => {
      currentResolveFn = resolve;
      mutationFn(variable, stateBeforeExecute)
        .then((data) => {
          if (promise !== ongoingPromise) {
            return resolve({ data, variable });
          }
          store.setState({
            state: 'SUCCESS',
            isPending: false,
            isSuccess: true,
            isError: false,
            variable,
            data,
            dataUpdatedAt: Date.now(),
            error: undefined,
            errorUpdatedAt: undefined,
          });
          resolve({ data, variable });
          resolveFns.clear();
          onSuccess(data, variable, stateBeforeExecute);
        })
        .catch((error) => {
          if (promise !== ongoingPromise) {
            return resolve({ error, variable });
          }
          store.setState({
            state: 'ERROR',
            isPending: false,
            isSuccess: false,
            isError: true,
            variable,
            data: undefined,
            dataUpdatedAt: undefined,
            error,
            errorUpdatedAt: Date.now(),
          });
          resolve({ error, variable });
          resolveFns.clear();
          if (onError) onError(error, variable, stateBeforeExecute);
          else console.error(store.getState());
        })
        .finally(() => {
          if (promise !== ongoingPromise) return;
          onSettled(variable, stateBeforeExecute);
          ongoingPromise = undefined;
        });
    });

    if (ongoingPromise) resolveFns.forEach((resolveFn) => resolveFn(promise));
    resolveFns.add(currentResolveFn!);
    ongoingPromise = promise;

    return promise;
  };

  return Object.assign(useStore, {
    subscribe: store.subscribe,
    getSubscribers: store.getSubscribers,
    getState: store.getState,

    /**
     * Manually updates the mutation state.
     *
     * @remarks
     * - Intended for advanced use cases.
     * - Prefer using provided mutation actions (`execute`, `reset`) instead.
     */
    setState: (value: SetState<TState>) => {
      console.debug('Manual setState (not via provided actions) on mutation store');
      store.setState(value);
    },

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
    execute: execute as TVariable extends undefined
      ? () => Promise<{ variable: undefined; data?: TData; error?: TError }>
      : (variable: TVariable) => Promise<{ variable: TVariable; data?: TData; error?: TError }>,

    /**
     * Resets the mutation state back to its initial state.
     *
     * @remarks
     * - Does not cancel any ongoing request.
     * - If a request is still pending, its result may override the reset state.
     */
    reset: () => {
      if (store.getState().isPending) {
        console.warn(
          'Mutation state was reset while a request is still pending. The request will continue, but its result may override the reset state.',
        );
      }
      store.setState(initialState);
    },
  });
};
