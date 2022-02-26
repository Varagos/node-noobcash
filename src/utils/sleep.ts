// export const setImmediatePromise = () =>
//   new Promise((resolve) => {
//     setImmediate(() => resolve());
//   });

export function setImmediatePromise() {
  return new Promise((resolve) => {
    setImmediate(() => resolve(1));
  });
}
