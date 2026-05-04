import { describe, expect, it } from "vitest";
import { createDisconnectAwareStream } from "../../open-sse/utils/streamHandler.js";

function makeStreamController() {
  return {
    connected: true,
    completed: false,
    errored: false,
    isConnected() {
      return this.connected;
    },
    handleComplete() {
      this.completed = true;
      this.connected = false;
    },
    handleError() {
      this.errored = true;
      this.connected = false;
    },
    handleDisconnect() {
      this.connected = false;
    },
  };
}

function makeBenignTerminationError() {
  const socketError = new Error("other side closed");
  socketError.code = "UND_ERR_SOCKET";
  const terminated = new TypeError("terminated");
  terminated.cause = socketError;
  return terminated;
}

describe("streamHandler", () => {
  it("closes gracefully when upstream terminates after yielding data", async () => {
    let reads = 0;
    const transformStream = {
      readable: {
        getReader() {
          return {
            async read() {
              reads += 1;
              if (reads === 1) {
                return { done: false, value: "chunk-1" };
              }
              throw makeBenignTerminationError();
            },
            cancel() {
              return Promise.resolve();
            },
          };
        },
      },
      writable: {
        getWriter() {
          return {
            abort() {
              return Promise.resolve();
            },
          };
        },
      },
    };

    const streamController = makeStreamController();
    const output = createDisconnectAwareStream(transformStream, streamController);
    const reader = output.getReader();

    const first = await reader.read();
    const second = await reader.read();

    expect(first).toEqual({ done: false, value: "chunk-1" });
    expect(second.done).toBe(true);
    expect(streamController.completed).toBe(true);
    expect(streamController.errored).toBe(false);
  });

  it("still errors on non-benign stream failures", async () => {
    const transformStream = {
      readable: {
        getReader() {
          return {
            async read() {
              throw new Error("boom");
            },
            cancel() {
              return Promise.resolve();
            },
          };
        },
      },
      writable: {
        getWriter() {
          return {
            abort() {
              return Promise.resolve();
            },
          };
        },
      },
    };

    const streamController = makeStreamController();
    const output = createDisconnectAwareStream(transformStream, streamController);
    const reader = output.getReader();

    await expect(reader.read()).rejects.toThrow("boom");
    expect(streamController.errored).toBe(true);
  });
});
