import { describe, expect, it } from "vitest";
import { isStreamClosedEnqueueError, safeEnqueue } from "../../open-sse/utils/safeStreamEnqueue.js";

describe("safe stream enqueue", () => {
  it("recognizes closed-stream enqueue errors", () => {
    expect(isStreamClosedEnqueueError(new TypeError("Invalid state: Unable to enqueue"))).toBe(true);
    expect(isStreamClosedEnqueueError({ code: "ERR_INVALID_STATE", message: "anything" })).toBe(true);
    expect(isStreamClosedEnqueueError(new Error("other"))).toBe(false);
  });

  it("suppresses enqueue on already-closed streams", () => {
    const controller = {
      enqueue() {
        const error = new TypeError("Invalid state: Unable to enqueue");
        error.code = "ERR_INVALID_STATE";
        throw error;
      },
    };

    expect(safeEnqueue(controller, new Uint8Array([1, 2, 3]))).toBe(false);
  });

  it("rethrows non-stream-state errors", () => {
    const controller = {
      enqueue() {
        throw new Error("boom");
      },
    };

    expect(() => safeEnqueue(controller, new Uint8Array([1]))).toThrow("boom");
  });
});
