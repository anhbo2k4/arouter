export function isStreamClosedEnqueueError(error) {
  if (!error) return false;
  return error.code === "ERR_INVALID_STATE" || (typeof error.message === "string" && error.message.includes("Invalid state: Unable to enqueue"));
}

export function safeEnqueue(controller, chunk) {
  try {
    controller.enqueue(chunk);
    return true;
  } catch (error) {
    if (isStreamClosedEnqueueError(error)) {
      return false;
    }
    throw error;
  }
}
