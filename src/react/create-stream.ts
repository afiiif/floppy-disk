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

/**
 * Represents the full state of a stream.
 *
 * @remarks
 * A stream consists of two independent concerns:
 *
 * 1. **Connection state** — lifecycle of the underlying connection
 * 2. **Data state** — lifecycle of emitted data
 *
 * These two are combined into a single state object.
 *
 * ---
 *
 * ## Connection lifecycle
 *
 * - `INITIAL` → no connection has been established
 * - `CONNECTING` → connection is being established
 * - `CONNECTED` → connection is active
 * - `DISCONNECTED` → connection was previously established but is now closed
 *
 * Timestamps:
 * - `connectingAt` → when connection attempt started
 * - `connectedAt` → when connection was established
 * - `disconnectedAt` → when connection was closed
 *
 * ---
 *
 * ## Data lifecycle
 *
 * - `INITIAL` → no data has been received
 * - `SUCCESS` → data has been received successfully
 * - `ERROR` → error occurred before any data
 * - `SUCCESS_BUT_THEN_ERROR` → data exists, but a later error occurred
 *
 * ---
 *
 * ## Notes
 *
 * - Connection state and data state evolve independently.
 * - A stream may be:
 *   - connected but have no data yet
 *   - disconnected but still retain previous data
 * - Errors do not necessarily reset data.
 */
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

  /**
   * Connection controls for the stream.
   *
   * @remarks
   * Provides imperative control over the underlying connection.
   */
  connection: {
    /**
     * Returns the current connection instance.
     *
     * @returns The active connection or `undefined` if not connected
     */
    get: () => Readonly<TConnection> | undefined;

    /**
     * Forces a reconnection.
     *
     * @remarks
     * - Cancels any scheduled disconnect
     * - Starts a new connection if not already connecting
     */
    reconnect: () => void;

    /**
     * Immediately disconnects the current connection.
     *
     * @remarks
     * - Ignores disconnect delay rules
     * - Updates connection state to `DISCONNECTED`
     */
    disconnect: () => void;
  };

  /**
   * Data controls for the stream.
   */
  data: {
    /**
     * Resets the data state back to `INITIAL`.
     *
     * @remarks
     * - Does not affect connection state
     * - Useful for clearing stale or invalid data
     */
    reset: () => void;
  };

  /**
   * Deletes the stream instance.
   *
   * @returns `true` if deleted, `false` otherwise
   *
   * @remarks
   * - Cannot delete while there are active subscribers
   * - Clears connection, state, and cached instance
   */
  delete: () => boolean;
};

/**
 * Configuration options for a stream.
 *
 * @remarks
 * Controls connection lifecycle, reconnection behavior, and data retention.
 */
export type StreamOptions<TConnection, TData, TError = Error> = InitStoreOptions<
  StreamState<TData, TError>,
  AdditionalStoreApi<TConnection>
> & {
  /**
   * Connection-related behavior.
   */
  connection?: {
    /**
     * Determines when a connection should be disconnected.
     *
     * @param trigger - The reason for the disconnect attempt
     * @param state - Current stream state
     *
     * @returns
     * - `number` → delay (ms) before disconnecting
     * - `false` → prevent disconnection
     *
     * @default Disconnect after 5 seconds for any triggers
     *
     * @remarks
     * Triggers:
     * - `"last-unsubscribe"` → no active subscribers
     * - `"document-hidden"` → tab becomes hidden
     * - `"offline"` → network goes offline
     */
    disconnectOn?: (
      trigger: DisconnectTrigger,
      state: StreamState<TData, TError>,
    ) => false | number;

    /**
     * Determines whether a connection should reconnect.
     *
     * @param trigger - The reason for the reconnect attempt
     * @param state - Current stream state
     *
     * @returns `true` to reconnect, otherwise `false`
     *
     * @default No reconnection if already connected
     *
     * @remarks
     * Triggers:
     * - `"first-subscribe"` → first subscriber appears
     * - `"document-visible"` → tab becomes visible
     * - `"online"` → network reconnects
     */
    reconnectOn?: (trigger: ReconnectTrigger, state: StreamState<TData, TError>) => boolean;
  };

  /**
   * Data-related behavior.
   */
  data?: {
    /**
     * Time (in milliseconds) before unused stream data is garbage collected.
     *
     * Starts counting after disconnection.
     *
     * @default 5 minutes
     */
    gcTime?: number;
  };
};

/**
 * Creates a stream factory for managing real-time connections.
 *
 * @param connect - Function to establish a connection
 * @param disconnect - Function to close a connection
 * @param options - Optional configuration for lifecycle and behavior
 *
 * @returns A function to retrieve or create a stream instance by variable
 *
 * @remarks
 * This utility is designed for **long-lived, push-based async sources**, such as:
 * - WebSocket
 * - Server-Sent Events (SSE)
 * - Firebase / realtime databases
 *
 * ---
 *
 * ## Key concepts
 *
 * ### 1. Connection lifecycle (managed automatically)
 *
 * - Connection is established when needed (e.g. first subscriber)
 * - Connection may be disconnected based on triggers:
 *   - no subscribers
 *   - tab hidden
 *   - offline
 * - Reconnection is controlled via `reconnectOn`
 *
 * ---
 *
 * ### 2. Data flow (push-based)
 *
 * The `connect` function receives an `emit` API:
 *
 * - `emit.connected()` → mark connection as established
 * - `emit.data(fn)` → update data using reducer
 * - `emit.error(err)` → report error
 *
 * Data updates are **incremental** and controlled by the stream source.
 *
 * ---
 *
 * ### 3. Store-per-variable
 *
 * - Each unique `variable` creates a separate stream instance
 * - Variables are deterministically hashed for stable identity
 * - Each instance manages its own:
 *   - connection
 *   - state
 *   - subscribers
 *
 * ---
 *
 * ### 4. React integration (Proxy-based)
 *
 * - The returned hook exposes the full state as a Proxy
 * - Components automatically subscribe to accessed properties
 * - No selector or memoization is required
 *
 * ---
 *
 * ## Execution model
 *
 * - Streams are **lazy**:
 *   - No connection until there is a subscriber
 * - Streams are **shared**:
 *   - Multiple subscribers reuse the same connection
 * - Streams are **stateful**:
 *   - Data persists across reconnects (unless reset or GC)
 *
 * ---
 *
 * @example
 * const chatStream = createStream(
 *   (roomId, emit) => {
 *     const ws = new WebSocket(`/chat/${roomId}`);
 *
 *     ws.onopen = () => emit.connected();
 *     ws.onmessage = (e) => {
 *       const msg = JSON.parse(e.data);
 *       emit.data((prev) => [...(prev ?? []), msg]);
 *     };
 *     ws.onerror = (err) => emit.error(err);
 *
 *     return ws;
 *   },
 *   (ws) => ws.close()
 * );
 *
 * function Chat({ roomId }) {
 *   const useChat = chatStream(roomId);
 *   const state = useChat();
 *
 *   return <div>{state.data?.length}</div>;
 * }
 */
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
