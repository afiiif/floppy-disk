import { noop } from '../utils';
import { InitStoreOptions } from '../vanilla';
import { createStore, UseStore } from './create-store';

export type MutationState<TVar, TResponse = any, TError = unknown> = {
  /**
   * Network fetching status.
   */
  isWaiting: boolean;
  isSuccess: boolean;
  isError: boolean;
  response: TResponse | undefined;
  responseUpdatedAt: number | null;
  error: TError | undefined;
  errorUpdatedAt: number | null;
  /**
   * Mutate function.
   *
   * @returns Promise that will always get resolved.
   */
  mutate: TVar extends undefined
    ? () => Promise<{ response?: TResponse; error?: TError; variables?: TVar }>
    : (variables: TVar) => Promise<{ response?: TResponse; error?: TError; variables?: TVar }>;
};

export type UseMutation<TVar, TResponse = any, TError = unknown> = UseStore<
  MutationState<TVar, TResponse, TError>
>;

export type CreateMutationOptions<TVar, TResponse = any, TError = unknown> = InitStoreOptions<
  MutationState<TVar, TResponse, TError>
> & {
  onMutate?: (variables: TVar, stateBeforeMutate: MutationState<TVar, TResponse, TError>) => void;
  onSuccess?: (
    response: TResponse,
    variables: TVar,
    stateBeforeMutate: MutationState<TVar, TResponse, TError>,
  ) => void;
  onError?: (
    error: TError,
    variables: TVar,
    stateBeforeMutate: MutationState<TVar, TResponse, TError>,
  ) => void;
  onSettled?: (variables: TVar, stateBeforeMutate: MutationState<TVar, TResponse, TError>) => void;
};

/**
 * @see https://floppy-disk.vercel.app/docs/api#createmutation
 */
export const createMutation = <TVar, TResponse = any, TError = unknown>(
  mutationFn: (
    variables: TVar,
    state: MutationState<TVar, TResponse, TError>,
  ) => Promise<TResponse>,
  options: CreateMutationOptions<TVar, TResponse, TError> = {},
): UseMutation<TVar, TResponse, TError> => {
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
      response: undefined,
      responseUpdatedAt: null,
      error: undefined,
      errorUpdatedAt: null,
      mutate: ((variables) => {
        set({ isWaiting: true });
        const stateBeforeMutate = get();
        onMutate(variables, stateBeforeMutate);
        return new Promise((resolve) => {
          mutationFn(variables, stateBeforeMutate)
            .then((response) => {
              set({
                isWaiting: false,
                isSuccess: true,
                isError: false,
                response,
                responseUpdatedAt: Date.now(),
                error: undefined,
                errorUpdatedAt: null,
              });
              onSuccess(response, variables, stateBeforeMutate);
              resolve({ response, variables });
            })
            .catch((error: TError) => {
              set({
                isWaiting: false,
                isSuccess: false,
                isError: true,
                error,
                errorUpdatedAt: Date.now(),
              });
              onError(error, variables, stateBeforeMutate);
              resolve({ error, variables });
            })
            .finally(() => {
              onSettled(variables, stateBeforeMutate);
            });
        });
      }) as TVar extends undefined
        ? () => Promise<{ response?: TResponse; error?: TError; variables?: TVar }>
        : (variables: TVar) => Promise<{ response?: TResponse; error?: TError; variables?: TVar }>,
    }),
    createStoreOptions,
  );

  return useMutation;
};
