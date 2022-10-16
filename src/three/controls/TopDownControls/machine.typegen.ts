// This file was automatically generated. Edits will be overwritten

export interface Typegen0 {
  "@@xstate/typegen": true;
  internalEvents: {
    "xstate.init": { type: "xstate.init" };
    "xstate.stop": { type: "xstate.stop" };
  };
  invokeSrcNameMap: {
    checkUpdate$: "done.invoke.topDownControls.panning:invocation[0]";
    update$: "done.invoke.topDownControls.panning.animating:invocation[0]";
  };
  missingImplementations: {
    actions: never;
    services: never;
    guards: never;
    delays: never;
  };
  eventsCausingActions: {
    animatePan: "UPDATE";
    dolly: "DOLLY_MOVE";
    pan: "PAN_MOVE";
    panEnd: "ANIMATE" | "PAN_END" | "RESET" | "xstate.stop";
    panStart: "PAN_MOVE";
  };
  eventsCausingServices: {
    checkUpdate$: "xstate.init";
    update$: "ANIMATE";
  };
  eventsCausingGuards: {
    inDebugMode: "DOLLY_MOVE";
  };
  eventsCausingDelays: {};
  matchesStates:
    | "dollying"
    | "dollying.active"
    | "panning"
    | "panning.active"
    | "panning.animating"
    | "panning.idle"
    | { dollying?: "active"; panning?: "active" | "animating" | "idle" };
  tags: never;
}
