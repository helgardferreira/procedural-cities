import { createMachine } from "xstate";
import { TopDownControls } from ".";
import { SimpleInterpreter } from "../../../utils/types";

interface TopDownControlsMachineContext {}

type TopDownControlsMachineEvent =
  | { type: "PAN_END" }
  | { type: "PAN_MOVE"; data: PointerEvent }
  | { type: "DOLLY_MOVE"; data: WheelEvent };

export const topDownControlsMachineCreator = (controls: TopDownControls) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QBcD2AHAIqg7gOwGFU9kAnVAG1gDp0BDPPASzymqYgrAGIAFAQQByAfQCyAeQBqAUUSh0qWE2RNickAA9EAJgDsu6gEYArADZtx4wAYALFfP6bAGhABPHQA5j1U790BmXV8PU11tGwBfCJc0LFxCYjJKGnpGFjY6AGMVADceAREJGXUFJRU1JE1EGxt-al0PQ3CrY10ATkNDQJd3BENTD2orYZb2q10rfw9-YyiYjGx8IhJyKloGZlY+IWFpQUwSxWVVPHUtBDCez29fUMDg0PC5kFjFhJXk6ghKCld07kw4gAMkCAJpiKSySqlY4VUDnS5uRDGbR1EaTYxtawdSLPPCoCBwdSveLLJJrVKbNgcLiHMonM6IQxtOomcw2Dxhfw1PT+K4IbQeKxGPyGMatQVtZ4kpaJVYpDbpahZXJgOmw06Vc42TrUYxs8LhZkeE387SmYXohyclEeaULUlyz6U9Lq8qa+HVDz8jw2IYjSXGGbM-r2uKyj5rb4UX5KlVMPJuhlanSovUNTptcKWDxtNr8oMGdGonH+PPaMNvMnyr4-P6sJNwqoIDn82ptf3DXQmMJ2FmzaIvB0R8nwaFHd2MgXOJF9QzUPOLpdL9pRKJAA */
  createMachine(
    {
      tsTypes: {} as import("./machine.typegen").Typegen0,
      schema: {
        events: {} as TopDownControlsMachineEvent,
        context: {} as TopDownControlsMachineContext,
      },
      predictableActionArguments: true,
      type: "parallel",
      states: {
        panning: {
          initial: "idle",
          states: {
            idle: {
              on: {
                PAN_MOVE: {
                  target: "active",
                },
              },
            },
            active: {
              entry: "panStart",
              exit: "panEnd",
              on: {
                PAN_MOVE: {
                  actions: "pan",
                },
              },
            },
          },
          on: {
            PAN_END: {
              target: ".idle",
            },
          },
        },
        dollying: {
          initial: "active",
          states: {
            active: {},
          },
          on: {
            DOLLY_MOVE: {
              actions: "dolly",
              target: ".active",
            },
          },
        },
      },
      id: "topDownControls",
    },
    {
      actions: {
        panStart: (context, event) => {
          controls.handlePointerDown(event.data);
        },
        pan: (context, event) => {
          controls.handlePointerMove(event.data);
        },
        panEnd: (context, event) => {
          controls.handlePointerUp();
        },
        dolly: (context, event) => {
          controls.handleMouseWheel(event.data);
        },
      },
    }
  );

export type TopDownControlsInterpreter = SimpleInterpreter<
  TopDownControlsMachineContext,
  TopDownControlsMachineEvent
>;
