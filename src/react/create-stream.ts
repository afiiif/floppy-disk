import {
  type InitStoreOptions,
  type SetStateInput,
  type StoreApi,
  getHash,
  initStore,
  isClient,
} from "../vanilla.ts";
import type { StoreKey } from "./create-stores.ts";
import { useStoreState } from "./use-store.ts";

type StreamDataState<TData, TError> =
  | {
      state: "INITIAL";
      isSuccess: false;
      isError: false;
      data: undefined;
      dataUpdatedAt: undefined;
      error: undefined;
      errorUpdatedAt: undefined;
    }
  | {
      state: "SUCCESS";
      isSuccess: true;
      isError: false;
      data: TData;
      dataUpdatedAt: number;
      error: undefined;
      errorUpdatedAt: undefined;
    }
  | {
      state: "ERROR";
      isSuccess: false;
      isError: true;
      data: undefined;
      dataUpdatedAt: undefined;
      error: TError;
      errorUpdatedAt: number;
    }
  | {
      state: "SUCCESS_BUT_THEN_ERROR";
      isSuccess: true;
      isError: true;
      data: TData;
      dataUpdatedAt: number;
      error: TError;
      errorUpdatedAt: number;
    };

export type StreamState<TData, TError> =
  | ({
      connectionState: "INITIAL";
      connectingAt: undefined;
      connectedAt: undefined;
      disconnectedAt: undefined;
    } & Extract<StreamDataState<TData, TError>, { state: "INITIAL" }>)
  | ({
      connectionState: "CONNECTING";
      connectingAt: number;
      connectedAt: undefined;
      disconnectedAt: undefined;
    } & StreamDataState<TData, TError>)
  | ({
      connectionState: "CONNECTED";
      connectingAt: number;
      connectedAt: number;
      disconnectedAt: undefined;
    } & StreamDataState<TData, TError>)
  | ({
      connectionState: "DISCONNECTED";
      connectingAt: number;
      connectedAt: number | undefined;
      disconnectedAt: number;
    } & StreamDataState<TData, TError>);

const INITIAL_STATE: StreamState<any, any> = {
  connectionState: "INITIAL",
  connectingAt: undefined,
  connectedAt: undefined,
  disconnectedAt: undefined,
  state: "INITIAL",
  isSuccess: false,
  isError: false,
  data: undefined,
  dataUpdatedAt: undefined,
  error: undefined,
  errorUpdatedAt: undefined,
};

type DisconnectTrigger = "last-unsubscribe" | "document-hidden" | "offline";
type ReconnectTrigger = "first-subscribe" | "document-visible" | "online";

type AdditionalStoreApi<TConnection> = {
  variableHash: string;
  connection: {
    get: () => Readonly<TConnection> | undefined;
    reconnect: () => void;
    disconnect: () => void;
  };
  data: {
    reset: () => void;
  };
  delete: () => boolean;
};

export type StreamOptions<TConnection, TData, TError = Error> = InitStoreOptions<
  StreamState<TData, TError>,
  AdditionalStoreApi<TConnection>
> & {
  connection?: {
    disconnectOn?: (
      trigger: DisconnectTrigger,
      state: StreamState<TData, TError>,
    ) => false | number;
    reconnectOn?: (trigger: ReconnectTrigger, state: StreamState<TData, TError>) => boolean;
  };
  data?: {
    gcTime?: number;
  };
};

export const experimental_createStream = <
  TConnection,
  TData,
  TVariable extends StoreKey,
  TError = Error,
>(
  connect: (
    variable: TVariable,
    emit: {
      connected: () => void;
      data: (reducer: (data: TData | undefined) => TData) => void;
      error: (error: TError) => void;
    },
  ) => TConnection,
  disconnect: (connection: TConnection) => void,
  options: StreamOptions<TConnection, TData, TError> = {},
) => {
  const {
    disconnectOn = () => 5000, // 5 seconds after any `DisconnectTrigger`
    reconnectOn = () => false, // no need reconnect if still connected
  } = options.connection || {};

  const {
    gcTime = 5 * 60 * 1000, // 5 minutes
  } = options.data || {};

  type TState = StreamState<TData, TError>;
  const initialState: TState = { ...INITIAL_STATE };

  type TAdditionalStoreApi = AdditionalStoreApi<TConnection>;
  type TStore = StoreApi<TState> & TAdditionalStoreApi;
  const stores = new Map<string, TStore>();

  const connections = new WeakMap<TStore, TConnection>();
  const disconnectFns = new WeakMap<TStore, () => void>();

  const disconnectTimeoutIds: WeakMap<
    TStore,
    Partial<Record<DisconnectTrigger, number>>
  > = new WeakMap();

  const clearAllTimeouts = (store: TStore) => {
    const gcTimeoutId = gcTimeoutIds.get(store);
    if (gcTimeoutId) {
      clearTimeout(gcTimeoutId);
      gcTimeoutIds.delete(store);
    }

    const disconnectTimeoutIds_ = disconnectTimeoutIds.get(store);
    if (disconnectTimeoutIds_) {
      clearTimeout(disconnectTimeoutIds_["last-unsubscribe"]);
      clearTimeout(disconnectTimeoutIds_["document-hidden"]);
      clearTimeout(disconnectTimeoutIds_.offline);
    }
  };

  const gcTimeoutIds = new WeakMap<TStore, number>();

  // -------

  const configureStoreEvents = (): InitStoreOptions<TState, TAdditionalStoreApi> => ({
    ...options,
    onFirstSubscribe: (state, store) => {
      clearTimeout(disconnectTimeoutIds.get(store)?.["last-unsubscribe"]);
      options.onFirstSubscribe?.(state, store);
      triggerReconnect(store, "first-subscribe");
      if (isClient) {
        visibilityChangeListeners.add(triggers.visibilityChange);
        onlineListeners.add(triggers.online);
        offlineListeners.add(triggers.offline);
        if (!listenersAdded) {
          document.addEventListener("visibilitychange", onVisibilityChange);
          window.addEventListener("online", onWindowOnline);
          window.addEventListener("offline", onWindowOffline);
          listenersAdded = true;
        }
      }
    },
    onLastUnsubscribe: (state, store) => {
      options.onLastUnsubscribe?.(state, store);
      triggerDisconnect(store, "last-unsubscribe");
      if (isClient) {
        visibilityChangeListeners.delete(triggers.visibilityChange);
        onlineListeners.delete(triggers.online);
        offlineListeners.delete(triggers.offline);
        if (visibilityChangeListeners.size === 0) {
          // Can be guaranteed that other listener size is 0 as well
          document.removeEventListener("visibilitychange", onVisibilityChange);
          window.removeEventListener("online", onWindowOnline);
          window.removeEventListener("offline", onWindowOffline);
          listenersAdded = false;
        }
      }
    },
  });

  const disconnectAndSetState = (store: TStore, showLog = false) => {
    if (store.getSubscriberCount() && showLog) {
      console.log("Stream disconnected while there is subscriber");
    }

    clearAllTimeouts(store);

    disconnectFns.get(store)?.();
    if (store.getState().connectionState !== "INITIAL") {
      store.setState({
        connectionState: "DISCONNECTED",
        disconnectedAt: Date.now(),
      });
    }
    connections.delete(store);
    disconnectFns.delete(store);

    gcTimeoutIds.set(
      store,
      setTimeout(() => {
        if (store.getSubscriberCount() === 0) store.delete();
      }, gcTime),
    );
  };

  const getStore = (variable: TVariable = {} as TVariable) => {
    const variableHash = getHash(variable);
    let store: TStore;

    if (stores.has(variableHash)) {
      store = stores.get(variableHash)!;
    } else {
      store = initStore(
        initialState,
        configureStoreEvents() as any, // Intentionally using as any: don't want to add generic on `initStore`
      ) as TStore;
      store.variableHash = variableHash;
      stores.set(variableHash, store);

      store.connection = {} as any;
      store.connection.get = () => connections.get(store);

      store.connection.reconnect = () => {
        clearAllTimeouts(store);

        const { connectionState } = store.getState();
        if (connectionState === "CONNECTING") return;

        const prevDisconnect = disconnectFns.get(store);
        if (prevDisconnect) {
          prevDisconnect();
          disconnectFns.delete(store);
        }

        store.setState({
          connectionState: "CONNECTING",
          connectingAt: Date.now(),
          connectedAt: undefined,
          disconnectedAt: undefined,
        });

        const connection = connect(variable, {
          connected: () => {
            store.setState({
              connectionState: "CONNECTED",
              connectedAt: Date.now(),
              disconnectedAt: undefined,
            });
          },
          data: (reducer) => {
            store.setState((prev) => ({
              connectionState: "CONNECTED",
              connectedAt: prev.connectedAt ?? Date.now(),
              state: "SUCCESS",
              isSuccess: true,
              isError: false,
              data: reducer(prev.data),
              dataUpdatedAt: Date.now(),
              error: undefined,
              errorUpdatedAt: undefined,
            }));
          },
          error: (error) => {
            store.setState((prev) => ({
              state: prev.state === "SUCCESS" ? "SUCCESS_BUT_THEN_ERROR" : "ERROR",
              isError: true,
              error,
              errorUpdatedAt: Date.now(),
            }));
          },
        });

        connections.set(store, connection);
        disconnectFns.set(store, () => disconnect(connection));
      };

      store.connection.disconnect = () => disconnectAndSetState(store, true);

      store.data = {} as any;
      store.data.reset = () => {
        store.setState({
          state: "INITIAL",
          isSuccess: false,
          isError: false,
          data: undefined,
          dataUpdatedAt: undefined,
          error: undefined,
          errorUpdatedAt: undefined,
        });
      };

      store.delete = () => {
        if (store.getSubscriberCount() > 0) {
          console.warn(
            "Cannot delete store while it still has active subscribers. Unsubscribe all listeners before deleting the store.",
          );
          return false;
        }
        clearAllTimeouts(store);
        store.setState(initialState);
        return stores.delete(variableHash);
      };
    }

    const useStore = (options?: { initialData?: TData }) =>
      useStoreState(store, {
        initialState: { data: options?.initialData } as any,
      });

    return Object.assign(useStore, {
      ...store,
      setState: (value: SetStateInput<TState>) => {
        console.debug("Manual setState (not via provided actions) on stream store");
        store.setState(value);
      },
    });
  };

  // -------

  const triggerReconnect = (store: TStore, trigger: ReconnectTrigger) => {
    clearAllTimeouts(store);

    const { connectionState } = store.getState();
    if (connectionState === "INITIAL" || connectionState === "DISCONNECTED") {
      // Force reconnect if has subscriber but is not connected
      queueMicrotask(() => {
        // Defer connecting so that the connectionState update to "CONNECTING" is broadcasted to all subscribers
        store.connection.reconnect();
      });
      return;
    }
    const shouldReconnect = reconnectOn(trigger, store.getState());
    if (shouldReconnect) store.connection.reconnect();
  };

  const triggerDisconnect = (store: TStore, trigger: DisconnectTrigger) => {
    const disconnectDelay = disconnectOn(trigger, store.getState());
    if (typeof disconnectDelay !== "number") return;
    if (!disconnectTimeoutIds.has(store)) disconnectTimeoutIds.set(store, {});
    const disconnectTimeoutIds_ = disconnectTimeoutIds.get(store)!;
    disconnectTimeoutIds_[trigger] = setTimeout(() => {
      disconnectAndSetState(store);
    }, disconnectDelay);
  };

  const triggers = {
    visibilityChange: () => {
      console.info("visibilityChange", document.visibilityState);
      if (document.visibilityState === "visible") {
        stores.forEach((store) => triggerReconnect(store, "document-visible"));
      } else {
        stores.forEach((store) => triggerDisconnect(store, "document-hidden"));
      }
    },
    online: () => stores.forEach((store) => triggerReconnect(store, "online")),
    offline: () => stores.forEach((store) => triggerDisconnect(store, "offline")),
  };

  return getStore;
};

const visibilityChangeListeners = new Set<() => void>();
const onVisibilityChange = () => [...visibilityChangeListeners].forEach((fn) => fn());

const onlineListeners = new Set<() => void>();
const onWindowOnline = () => [...onlineListeners].forEach((fn) => fn());
const offlineListeners = new Set<() => void>();
const onWindowOffline = () => [...offlineListeners].forEach((fn) => fn());

let listenersAdded = false;
