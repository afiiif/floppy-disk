import { type InitStoreOptions, type SetState, initStore, noop } from '../vanilla.ts';
import { useStoreState } from './use-store.ts';

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

export type MutationOptions<TData, TVariable> = InitStoreOptions<
  MutationState<TData, TVariable>
> & {
  onSuccess?: (
    data: TData,
    variable: TVariable,
    stateBeforeExecute: MutationState<TData, TVariable>,
  ) => void;
  onError?: (
    error: any,
    variable: TVariable,
    stateBeforeExecute: MutationState<TData, TVariable>,
  ) => void;
  onSettled?: (
    variable: TVariable,
    stateBeforeExecute: MutationState<TData, TVariable>, //
  ) => void;
};

export const createMutation = <TData, TVariable = never>(
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
    setState: (value: SetState<TState>) => {
      console.debug('Manual setState (not via provided actions) on mutation store');
      store.setState(value);
    },
    execute,
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
