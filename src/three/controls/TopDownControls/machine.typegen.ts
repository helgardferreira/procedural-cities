// This file was automatically generated. Edits will be overwritten

export interface Typegen0 {
  "@@xstate/typegen": true;
  internalEvents: {
    "xstate.init": { type: "xstate.init" };
    "xstate.stop": { type: "xstate.stop" };
  };
  invokeSrcNameMap: {};
  missingImplementations: {
    actions: never;
    services: never;
    guards: never;
    delays: never;
  };
  eventsCausingActions: {
    dolly: "DOLLY_MOVE";
    pan: "PAN_MOVE";
    panEnd: "PAN_END" | "xstate.stop";
    panStart: "PAN_MOVE";
  };
  eventsCausingServices: {};
  eventsCausingGuards: {};
  eventsCausingDelays: {};
  matchesStates:
    | "dollying"
    | "dollying.active"
    | "panning"
    | "panning.active"
    | "panning.idle"
    | { dollying?: "active"; panning?: "active" | "idle" };
  tags: never;
}
