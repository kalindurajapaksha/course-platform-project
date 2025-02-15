export function sumArray<T>(arr: T[], cb: (item: T) => number) {
  return arr.reduce((acc, next) => cb(next) + acc, 0);
}
