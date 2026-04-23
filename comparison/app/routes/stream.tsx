import { experimental_createStream as createStream } from "floppy-disk/react";
import { useState } from "react";

import { CardWithReRenderHighlight } from "../shared/components";
import { FakeWebSocket } from "../shared/utils";

export function meta() {
  return [
    { title: "FloppyDisk.ts Stream" },
    { name: "description", content: "FloppyDisk.ts stream" },
  ];
}

export default function Stream() {
  return (
    <>
      <h1 className="font-bold pb-4">FloppyDisk.ts for Stream</h1>
      <ExampleStream />
    </>
  );
}

const chatStream = createStream<FakeWebSocket, Array<{ text: string; at: number }>, string>(
  (roomId, emit) => {
    const ws = new FakeWebSocket(`ws://api/chat/${roomId}`);

    ws.onopen = () => {
      emit.connected();
    };

    ws.onmessage = (e) => {
      const message = JSON.parse(e.data);
      emit.data((prev = []) => [...prev, message]);
    };

    ws.onerror = (e) => {
      emit.error((e as any).error);
    };

    return ws;
  },
  (ws) => ws.close(),
);

function ExampleStream() {
  const [id, setId] = useState(1);
  const roomId = String(id);
  return (
    <CardWithReRenderHighlight>
      <div className="flex gap-3 pb-4 items-center">
        <button onClick={() => setId((p) => p - 1)} disabled={!id}>
          {"<"}
        </button>
        <div>id: {roomId}</div>
        <button onClick={() => setId((p) => p + 1)}>{">"}</button>
      </div>
      <ChatStreamState roomId={roomId} />
      <ChatStreamConnectionLifeCycle roomId={roomId} />
      <ChatStreamDataLifeCycle roomId={roomId} />
      <ChatStreamActions roomId={roomId} />
    </CardWithReRenderHighlight>
  );
}

function ChatStreamState({ roomId }: { roomId: string }) {
  const useChatStream = chatStream(roomId);
  const { data = [], error } = useChatStream();
  return (
    <CardWithReRenderHighlight>
      <h3>Total messages: {data.length}</h3>
      <pre className="text-xs">{JSON.stringify(data, null, 2)}</pre>
      {error && <div className="text-xs mt-3 text-red-400">{error.message}</div>}
    </CardWithReRenderHighlight>
  );
}
function ChatStreamConnectionLifeCycle({ roomId }: { roomId: string }) {
  const useChatStream = chatStream(roomId);
  const { connectionState, connectingAt, connectedAt, disconnectedAt } = useChatStream();
  return (
    <CardWithReRenderHighlight>
      <h3>Connection Lifecycle</h3>
      <pre className="text-xs">
        {JSON.stringify({ connectionState, connectingAt, connectedAt, disconnectedAt }, null, 2)}
      </pre>
    </CardWithReRenderHighlight>
  );
}
function ChatStreamDataLifeCycle({ roomId }: { roomId: string }) {
  const useChatStream = chatStream(roomId);
  const { state, isSuccess, isError } = useChatStream();
  return (
    <CardWithReRenderHighlight>
      <h3>Data Lifecycle</h3>
      <pre className="text-xs">{JSON.stringify({ state, isSuccess, isError }, null, 2)}</pre>
    </CardWithReRenderHighlight>
  );
}

function ChatStreamActions({ roomId }: { roomId: string }) {
  const useChatStream = chatStream(roomId);
  return (
    <>
      <CardWithReRenderHighlight>
        <form
          className="flex gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            const ws = useChatStream.connection.get();
            ws?.send(JSON.stringify({ data: data.get("msg") }));
            e.currentTarget.reset();
          }}
        >
          <input
            type="text"
            name="msg"
            placeholder="Input message..."
            className="flex-1 border px-2 py-0.5 rounded"
            maxLength={32}
          />
          <button type="submit">Send message</button>
        </form>
      </CardWithReRenderHighlight>
      <CardWithReRenderHighlight className="!mb-0 flex gap-3">
        <button type="button" className="w-full" onClick={() => useChatStream.data.reset()}>
          Reset data
        </button>
        <button
          type="button"
          className="w-full"
          onClick={() => useChatStream.connection.reconnect()}
        >
          Reconnect
        </button>
      </CardWithReRenderHighlight>
    </>
  );
}
