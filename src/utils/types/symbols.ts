export const $$observable: typeof Symbol.observable = (() =>
  (typeof Symbol === "function" && Symbol.observable) ||
  "@@observable")() as any;
