export function zeroBuffer(buf: ArrayBuffer): void {
  new Uint8Array(buf).fill(0);
}

export function zeroUint8Array(arr: Uint8Array): void {
  arr.fill(0);
}
