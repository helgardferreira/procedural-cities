import { createMachine } from "xstate";
import { TopDownControls } from ".";
import { SimpleInterpreter } from "../../../utils/types";

interface TopDownControlsMachineContext {}

type TopDownControlsMachineEvent =
  | { type: "RESET" }
  | { type: "PAN_END" }
  | { type: "PAN_MOVE"; data: PointerEvent }
  | { type: "DOLLY_MOVE"; data: WheelEvent };

export function topDownControlsMachineCreator(this: TopDownControls) {
  /** @xstate-layout N4IgpgJg5mDOIC5QBcD2AHAIqg7gOwGFU9kAnVAG1gDp0BDPPASzymqYgrAGIAFAQQByAfQCyAeQBqAUUSh0qWE2RNickAA9EAJgDsu6gEYArADZtABgvGAzAA59h7aYA0IAJ467x6qb+6rbRsAFhtbAE4AX0i3NCxcQmIyShp6RhY2OgBjFQA3HgERCRl1BSUVNSRNRGDQ6l07J2NdJ21gw1M7GzdPBA67aisrDottY1DGm2jYjGx8IhJyKloGZlY+IWFpQUxSxWVVPHUtBF1tHsQbNuoumzDDcPDTAJtdaZA4ucTFlJX09YAStIAMrSAAqe3Kh2OiDOFwQelMNzuIW0dnCxi6ulM70+CQWyWWEEoFHcGW4mHEABkqQBNMRSWRVMoHSqgE5wjyIYxBQZDXQ2KzBfQ2HHvPCoCBwdR4+ZJJapVYZdicMCQ1lHKonB42IxmILhGwdV7BVxchF2CxGPydbRBCym5642b4+W-NJrTI5Jj5dUVTXsmqGQzUYwmcyjMNnc7m5xWoZWUyGO4PNrO+Jyn7LD0ZP3QrU1OzwrrUR5lszC9qGOx2dNfAkK6jEiik5XZPJq5n7f0whG85qNCyPUyvOymU3w2wGBPhYJPYwL8LaOuurM0Zut1h5tnVBDBIvm0LhPmBBpPZNTGIfF2ZwnwLtQncnNrwpwnhMfqxvaKRIA */
  return createMachine(
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
            RESET: {
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
        panStart: (context, { data }) => {
          this.panStart.set(data.clientX, data.clientY);
        },
        pan: (context, { data }) => {
          this.panEnd.set(data.clientX, data.clientY);

          this.panDelta
            .subVectors(this.panEnd, this.panStart)
            .multiplyScalar(this.panSpeed);

          this.pan(this.panDelta.x, this.panDelta.y);

          this.panStart.copy(this.panEnd);

          this.update();
        },
        panEnd: (context, event) => {
          this.panStart.set(0, 0);
        },
        dolly: (context, { data }) => {
          if (data.deltaY < 0) {
            this.dollyIn(this.getZoomScale());
          } else if (data.deltaY > 0) {
            this.dollyOut(this.getZoomScale());
          }

          this.update();
        },
      },
    }
  );
}

export type TopDownControlsInterpreter = SimpleInterpreter<
  TopDownControlsMachineContext,
  TopDownControlsMachineEvent
>;
