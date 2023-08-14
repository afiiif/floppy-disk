import { noop } from '../utils';
import { InitStoreOptions } from '../vanilla';
import { createStore } from './create-store';

export type MutationState<TVar, TResponse = any, TError = unknown> = {
  /**
   * Network fetching status.
   */
  isWaiting: boolean;
  isSuccess: boolean;
  isError: boolean;
  response: TResponse | null;
  responseUpdatedAt: number | null;
  error: TError | null;
  errorUpdatedAt: number | null;
  mutate: (variables?: TVar) => Promise<TResponse>;
};

export type CreateMutationOptions<TVar, TResponse = any, TError = unknown> = InitStoreOptions<
  MutationState<TVar, TResponse, TError>
> & {
  onMutate?: (
    variables: TVar | undefined,
    inputState: MutationState<TVar, TResponse, TError>,
  ) => void;
  onSuccess?: (
    response: TResponse,
    variables: TVar | undefined,
    inputState: MutationState<TVar, TResponse, TError>,
  ) => void;
  onError?: (
    error: TError,
    variables: TVar | undefined,
    inputState: MutationState<TVar, TResponse, TError>,
  ) => void;
  onSettled?: (
    variables: TVar | undefined,
    inputState: MutationState<TVar, TResponse, TError>,
  ) => void;
};

export const createMutation = <TVar, TResponse = any, TError = unknown>(
  mutationFn: (
    variables: TVar | undefined,
    state: MutationState<TVar, TResponse, TError>,
  ) => Promise<TResponse>,
  options: CreateMutationOptions<TVar, TResponse, TError> = {},
) => {
  const {
    onMutate = noop,
    onSuccess = noop,
    onError = noop,
    onSettled = noop,
    ...createStoreOptions
  } = options;

  const useMutation = createStore<MutationState<TVar, TResponse, TError>>(
    ({ set, get }) => ({
      isWaiting: false,
      isSuccess: false,
      isError: false,
      response: null,
      responseUpdatedAt: null,
      error: null,
      errorUpdatedAt: null,
      mutate: (variables) => {
        set({ isWaiting: true });
        const state = get();
        onMutate(variables, state);
        return new Promise((resolve, reject) => {
          mutationFn(variables, state)
            .then((response) => {
              set({
                isWaiting: false,
                isSuccess: true,
                response,
                responseUpdatedAt: Date.now(),
                error: null,
                errorUpdatedAt: null,
              });
              onSuccess(response, variables, state);
              resolve(response);
            })
            .catch((error: TError) => {
              set({
                isWaiting: true,
                isError: true,
                error,
                errorUpdatedAt: Date.now(),
              });
              onError(error, variables, state);
              reject(error);
            })
            .finally(() => {
              onSettled(variables, state);
            });
        });
      },
    }),
    createStoreOptions,
  );

  return useMutation;
};
