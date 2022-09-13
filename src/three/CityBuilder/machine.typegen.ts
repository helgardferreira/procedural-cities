// This file was automatically generated. Edits will be overwritten

export interface Typegen0 {
  "@@xstate/typegen": true;
  internalEvents: {
    "xstate.init": { type: "xstate.init" };
  };
  invokeSrcNameMap: {
    cityEdgeView$: "done.invoke.cityBuilder.active:invocation[0]";
    loadAssets$: "done.invoke.cityBuilder:invocation[0]";
  };
  missingImplementations: {
    actions: never;
    services: never;
    guards: never;
    delays: never;
  };
  eventsCausingActions: {
    spawnCity: "LOAD_ASSETS_COMPLETE";
    spawnCityOnEdges: "SPAWN_EDGE";
  };
  eventsCausingServices: {
    cityEdgeView$: "LOAD_ASSETS_COMPLETE";
    loadAssets$: "xstate.init";
  };
  eventsCausingGuards: {};
  eventsCausingDelays: {};
  matchesStates: "active" | "inactive" | "loading";
  tags: never;
}
