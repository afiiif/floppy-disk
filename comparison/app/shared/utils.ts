export const basicQueryFn1 = async () => {
  console.info("[tanstack]", "basicQueryFn called");
  await new Promise((r) => setTimeout(r, 2000));
  return {
    a: Math.random(),
    b: { c: { d: "always-same" } },
  };
};
export const basicQueryFn2 = async () => {
  console.info("[floppy-disk]", "basicQueryFn called");
  await new Promise((r) => setTimeout(r, 2000));
  return {
    a: Math.random(),
    b: { c: { d: "always-same" } },
  };
};

export const keyedQueryFn1 = async ({ id }: { id: number }) => {
  console.info("[tanstack]", "keyedQueryFn called", `id: ${id}`);
  await new Promise((r) => setTimeout(r, 2000));
  if (id === 3) {
    throw new Error("Boom!");
  }
  return {
    a: Math.random(),
    b: { id, value: "always-same" },
  };
};
export const keyedQueryFn2 = async ({ id }: { id: number }) => {
  console.info("[floppy-disk]", "keyedQueryFn called", `id: ${id}`);
  await new Promise((r) => setTimeout(r, 2000));
  if (id === 3) {
    throw new Error("Boom!");
  }
  return {
    a: Math.random(),
    b: { id, value: "always-same" },
  };
};

// ---

const randomString = (length = 8) => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

export const infQueryFn1 = async ({ cursor }: { cursor?: string }) => {
  console.info("[tanstack]", "infQueryFn called", `cursor: ${cursor}`);
  await new Promise((r) => setTimeout(r, 2000));
  return {
    data: [...Array(10).keys()].map((i) => ({
      id: `${randomString()}${cursor ? `-${cursor}` : ""}-${i}`,
      foo: Math.random(),
      bar: Math.random() < 0.5,
    })),
    meta: {
      currentCursor: cursor,
      nextCursor: randomString() as string | undefined,
    },
  };
};
export const infQueryFn2 = async ({ cursor }: { cursor?: string }) => {
  console.info("[floppy-disk]", "infQueryFn called", `cursor: ${cursor}`);
  await new Promise((r) => setTimeout(r, 2000));
  return {
    data: [...Array(10).keys()].map((i) => ({
      id: `${randomString()}${cursor ? `-${cursor}` : ""}-${i}`,
      foo: Math.random(),
      bar: Math.random() < 0.5,
    })),
    meta: {
      currentCursor: cursor,
      nextCursor: randomString() as string | undefined,
    },
  };
};

// ---

let mutationFn1Attemp = 0;
export const mutationFn1 = async ({ foo, bar }: { foo: number; bar?: string }) => {
  console.info("[tanstack]", "mutationFn called", { foo, bar });
  await new Promise((r) => setTimeout(r, 2000));
  if (++mutationFn1Attemp % 4 === 0) throw new Error("Mutation error");
  return {
    data: {
      a: Math.random(),
      b: randomString(),
    },
  };
};

let mutationFn2Attemp = 0;
export const mutationFn2 = async ({ foo, bar }: { foo: number; bar?: string }) => {
  console.info("[tanstack]", "mutationFn called", { foo, bar });
  await new Promise((r) => setTimeout(r, 2000));
  if (++mutationFn2Attemp % 4 === 0) throw new Error("Mutation error");
  return {
    data: {
      a: Math.random(),
      b: randomString(),
    },
  };
};

// ---

type WSListener = (event: any) => void;

export class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  url: string;
  readyState = FakeWebSocket.CONNECTING;

  // native-like handlers
  onopen: ((ev: Event) => any) | null = null;
  onmessage: ((ev: MessageEvent) => any) | null = null;
  onerror: ((ev: Event) => any) | null = null;
  onclose: ((ev: CloseEvent) => any) | null = null;

  private listeners: Record<string, WSListener[]> = {};

  private connectDelay: number;
  private messageInterval: number;
  private timer?: any;
  private tick = 0;

  constructor(
    url: string,
    opts?: {
      connectDelay?: number;
      messageInterval?: number;
    },
  ) {
    this.url = url;
    this.connectDelay = opts?.connectDelay ?? 1000; // default 1s
    this.messageInterval = opts?.messageInterval ?? 2000; // default 2s

    this.log("connecting...");

    setTimeout(() => {
      if (this.readyState !== FakeWebSocket.CONNECTING) return;

      this.readyState = FakeWebSocket.OPEN;
      this.log("open");
      this.dispatch("open", new Event("open"));

      this.startStream();
    }, this.connectDelay);
  }

  send(data: any) {
    if (this.readyState !== FakeWebSocket.OPEN) {
      throw new Error("WebSocket is not open");
    }

    this.log("send →", data);

    // simulate server processing delay
    setTimeout(() => {
      if (this.readyState !== FakeWebSocket.OPEN) return;

      // assume client sends JSON string
      let parsed: any;
      try {
        parsed = typeof data === "string" ? JSON.parse(data) : data;
      } catch {
        parsed = { raw: data };
      }

      const response = {
        ...parsed,
        echo: true, // 👈 mark as server echo
        at: Date.now(),
      };

      const event = new MessageEvent("message", {
        data: JSON.stringify(response),
      });

      this.log("message (echo) ←", response);
      this.dispatch("message", event);
    }, 400); // slight delay
  }

  close(code = 1000, reason = "") {
    if (this.readyState >= FakeWebSocket.CLOSING) return;

    this.readyState = FakeWebSocket.CLOSING;
    this.log("closing...");

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }

    setTimeout(() => {
      this.readyState = FakeWebSocket.CLOSED;

      const event = new CloseEvent("close", {
        code,
        reason,
        wasClean: true,
      });

      this.log("close");
      this.dispatch("close", event);
    }, 0);
  }

  addEventListener(type: string, cb: WSListener) {
    this.listeners[type] ??= [];
    this.listeners[type].push(cb);
  }

  removeEventListener(type: string, cb: WSListener) {
    this.listeners[type] = (this.listeners[type] || []).filter((f) => f !== cb);
  }

  // =========================
  // internal
  // =========================

  private startStream() {
    this.timer = setInterval(() => {
      if (this.readyState !== FakeWebSocket.OPEN) return;

      this.tick++;

      // 🔴 simulate error every 5th message
      if (this.tick % 5 === 0) {
        const err = new Event("error");
        (err as any).error = new Error(`Fake error at tick ${this.tick}`);

        this.log("error ←", (err as any).error.message);
        this.dispatch("error", err);

        return; // don't emit message on error tick
      }

      const payload = {
        text: `hello ${Math.random()}`,
        at: Date.now(),
      };

      const data = JSON.stringify(payload);

      this.log("message ←", data);

      const event = new MessageEvent("message", { data });
      this.dispatch("message", event);
    }, this.messageInterval);
  }

  private dispatch(type: string, event: any) {
    // property handler
    const handler = (this as any)[`on${type}`];
    if (typeof handler === "function") {
      handler.call(this, event);
    }

    // listeners
    for (const cb of this.listeners[type] || []) {
      cb(event);
    }
  }

  private log(...args: any[]) {
    const emoji =
      {
        "connecting...": "🟩",
        open: "🟢",
        "closing...": "🟥",
        close: "🔴",
      }[args[0] as string] || "🔔";
    console.log(`[ws] ${emoji} (${this.url})`, ...args);
  }
}
