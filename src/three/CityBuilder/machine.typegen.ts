// This file was automatically generated. Edits will be overwritten

export interface Typegen0 {
  "@@xstate/typegen": true;
  internalEvents: {
    "xstate.init": { type: "xstate.init" };
  };
  invokeSrcNameMap: {
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
    loadAssets$: "xstate.init";
  };
  eventsCausingGuards: {};
  eventsCausingDelays: {};
  matchesStates: "active" | "inactive" | "loading";
  tags: never;
}
