import { animationFrames, map, scan, timer } from "rxjs";
import { Vector2 } from "three";
import { createMachine } from "xstate";
import { TopDownControls } from ".";
import { SimpleInterpreter } from "../../../utils/types";

interface TopDownControlsMachineContext {}

type TopDownControlsMachineEvent =
  | { type: "RESET" }
  | { type: "ANIMATE" }
  | { type: "UPDATE"; timeDelta: number }
  | { type: "PAN_MOVE"; data: PointerEvent }
  | { type: "PAN_END" }
  | { type: "DOLLY_MOVE"; data: WheelEvent };

export function topDownControlsMachineCreator(this: TopDownControls) {
  /** @xstate-layout N4IgpgJg5mDOIC5QBcD2AHAIqg7gOwGFU9kAnVAG1gDp0BDPPASzymroGNkmA3MAYgAKAQQByAfQCiozAG0ADAF1EodKlhNuxFSAAeiAKwB2ABzUAzAYCc5kwCYAbHZtWALAYA0IAJ6JzDq2orIwcDJwMAXwivNCxcQmIyShp6RhY2Tm4+ITFxAFkAeQA1SQVlJBA1DS08HX0EczsjagcjYPkmgxNTK3kHL18EOw6omIxsfCIScipaBmZWdmYAWzpuVn4AVUFMYQAVUqUdKs0mbQr6u2dqEzcDW26Xd3MBxFc3IJCDVyM7VwBGOz-eRuUYgWITBLTZJzNIbABKkgAypI9mVjupTudQPVfq8ECEHNRnsDggCgSCwRD4lMkrNUgsoPwxABJPL7Q7lVSYmp1RB4nyIBx9IL3UlGcmkqnjGmJGYpebpHISQoldEVE68i78uz48yueSfUKheSucz-c2RaLgmWTOUwiCUCjeJWYAoAGXdAE18sVORjqmdatqCbrBQgrNcSSCJYCpWC8KgIHAdNS7dD6YrFkwIBQwAGscGcfz5M0DKX7PJAU9POHzEZmsFQtYrGETA4TD9pXF03SFXCMlxePmNTyg3yhv9XBZrLZHM5zHcXnX5AYjWE7Faxj2oX3YYylkxVusoAWtcXJ9PLDZ7E4a8vBtYzK3zTHJZTrWnd-L9+kz+OQz+fFQm7SFaR-R0KGddJ2CHPh-2xPQ-CcddwnxF9iQBRcQSsOMP23MD7VmSDoNYBCiyQoZXHxTtDWjMk8KsUDZQzeBR0DRD6gAWiA8MeNcKIoiAA */
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
          invoke: {
            src: "checkUpdate$",
          },
          initial: "idle",
          states: {
            idle: {},
            active: {
              entry: "panStart",
              exit: "panEnd",
              description:
                "The panning.active state represents the user actively interacting with the panning controls",
              on: {
                PAN_END: {
                  target: "idle",
                },
                PAN_MOVE: {
                  actions: "pan",
                },
              },
            },
            animating: {
              invoke: {
                src: "update$",
              },
              on: {
                UPDATE: {
                  actions: "animatePan",
                },
              },
            },
          },
          on: {
            RESET: {
              target: ".idle",
            },
            ANIMATE: {
              target: ".animating",
            },
            PAN_MOVE: {
              target: ".active",
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
              target: ".active",
              cond: "inDebugMode",
              actions: "dolly",
            },
          },
        },
      },
      id: "topDownControls",
    },
    {
      actions: {
        panStart: (_, { data }) => {
          this.panStart.set(data.clientX, data.clientY);
        },
        pan: (_, { data }) => {
          this.panEnd.set(data.clientX, data.clientY);

          this.panDelta
            .subVectors(this.panEnd, this.panStart)
            .multiplyScalar(this.panSpeed);

          this.pan(this.panDelta.x, this.panDelta.y);

          this.panStart.copy(this.panEnd);

          this.update();
        },
        animatePan: (_, { timeDelta }) => {
          // Acceleration effect
          // this.panDelta.addScalar(timeDelta / 1000);
          this.panDelta = new Vector2(-timeDelta / 10, 0);
          this.pan(this.panDelta.x, this.panDelta.y);
          this.update();
        },
        panEnd: () => {
          this.panStart.set(0, 0);
        },
        dolly: (_, { data }) => {
          if (data.deltaY < 0) {
            this.dollyIn(this.getZoomScale());
          } else if (data.deltaY > 0) {
            this.dollyOut(this.getZoomScale());
          }

          this.update();
        },
      },
      services: {
        update$: () =>
          animationFrames().pipe(
            map(({ timestamp }) => timestamp),
            scan(
              (acc, curr) => ({
                currentTimeStamp: curr,
                delta: acc.currentTimeStamp ? curr - acc.currentTimeStamp : 0,
              }),
              { currentTimeStamp: 0, delta: 0 }
            ),
            map(({ delta }) => ({
              type: "UPDATE",
              timeDelta: delta,
            }))
          ),
        // TODO: make checkUpdate$ more intelligent
        checkUpdate$: () =>
          timer(0, 10000).pipe(map(() => ({ type: "ANIMATE" }))),
      },
      guards: {
        inDebugMode: () => this.debug,
      },
    }
  );
}

export type TopDownControlsInterpreter = SimpleInterpreter<
  TopDownControlsMachineContext,
  TopDownControlsMachineEvent
>;
