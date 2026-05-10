// ArrayBuffers do not survive chrome.runtime.sendMessage (arrive as {}).
// Convert to/from number[] which serializes cleanly through Chrome's IPC.

export function bufToArr(buf: ArrayBuffer): number[] {
  return Array.from(new Uint8Array(buf));
}

export function arrToBuf(arr: number[]): ArrayBuffer {
  return new Uint8Array(arr).buffer;
}
