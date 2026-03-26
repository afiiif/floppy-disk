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
export type MutationState<TData, TVariable> = {
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
      error: any;
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
export type MutationOptions<TData, TVariable> = InitStoreOptions<
  MutationState<TData, TVariable>
> & {
  /**
   * Called when the mutation succeeds.
   */
  onSuccess?: (
    data: TData,
    variable: TVariable,
    stateBeforeExecute: MutationState<TData, TVariable>,
  ) => void;

  /**
   * Called when the mutation fails.
   */
  onError?: (
    error: any,
    variable: TVariable,
    stateBeforeExecute: MutationState<TData, TVariable>,
  ) => void;

  /**
   * Called after the mutation settles (either success or error).
   */
  onSettled?: (
    variable: TVariable,
    stateBeforeExecute: MutationState<TData, TVariable>, //
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
 * - Each execution overwrites the previous state.
 * - The mutation always resolves (never throws): the result contains either `data` or `error`.
 *
 * @example
 * const useCreateUser = createMutation(async (input) => {
 *   return api.createUser(input);
 * });
 *
 * const { isPending } = useCreateUser();
 * const result = await useCreateUser.execute({ name: 'John' });
 */
export const createMutation = <TData, TVariable = undefined>(
  mutationFn: (
    variable: TVariable,
    stateBeforeExecute: MutationState<TData, TVariable>,
  ) => Promise<TData>,
  options: MutationOptions<TData, TVariable> = {},
) => {
  const { onSuccess = noop, onError, onSettled = noop } = options;

  type TState = MutationState<TData, TVariable>;

  const initialState = INITIAL_STATE as TState;

  const store = initStore(initialState, options);
  const useStore = <TStateSlice = TState>(selector?: (state: TState) => TStateSlice) =>
    useStoreState(store, selector);

  const execute = (variable: TVariable) => {
    const stateBeforeExecute = store.getState();
    if (stateBeforeExecute.isPending) {
      console.warn(
        'Mutation executed while a previous execution is still pending. This may cause race conditions or unexpected state updates.',
      );
    }
    store.setState({ isPending: true });

    return new Promise<{ variable: TVariable; data?: TData; error?: any }>((resolve) => {
      mutationFn(variable, stateBeforeExecute)
        .then((data) => {
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
          onSuccess(data, variable, stateBeforeExecute);
        })
        .catch((error) => {
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
          if (onError) onError(error, variable, stateBeforeExecute);
          else console.error(store.getState());
        })
        .finally(() => {
          onSettled(variable, stateBeforeExecute);
        });
    });
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
     * - If a mutation is already in progress, a warning is logged.
     * - Concurrent executions are allowed but may lead to race conditions.
     * - The promise never rejects to simplify async handling.
     */
    execute: execute as TVariable extends undefined
      ? () => Promise<{ variable: undefined; data?: TData; error?: any }>
      : (variable: TVariable) => Promise<{ variable: TVariable; data?: TData; error?: any }>,

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
