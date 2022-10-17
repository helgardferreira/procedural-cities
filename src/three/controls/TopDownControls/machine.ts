import {
  animationFrames,
  EMPTY,
  finalize,
  interval,
  map,
  scan,
  switchMap,
} from "rxjs";
import { Vector2 } from "three";
import { createMachine, interpret } from "xstate";
import { TopDownControls } from ".";
import { fromDocumentVisibility } from "../../../utils/rxjs";
import { SimpleInterpreter } from "../../../utils/types";

interface TopDownControlsMachineContext {}

type TopDownControlsMachineEvent =
  | { type: "RESET" }
  | { type: "ANIMATE" }
  | { type: "UPDATE"; timeDelta: number }
  | { type: "PAN_MOVE"; data: PointerEvent }
  | { type: "PAN_END" }
  | { type: "DOLLY_MOVE"; data: WheelEvent };

export function createTopDownControlsMachine(this: TopDownControls) {
  return interpret(
    /** @xstate-layout N4IgpgJg5mDOIC5QBcD2AHAIqg7gOwGFU9kAnVAG1gDp0BDPPASzymqYgrAGIBBAOQCSAWV4AVAKIBtAAwBdRKHSpYTZE2KKQAD0QB2AJwBmanr1GZAJksBWPTYCM9gwBoQAT0QAWGTeoObADYDYJkZAxsjI0CAXxi3NCxcQmIyShp6RhY2OgBjdQA3HgAFAQB9CX5MWQUkEGVVdU063QQvduobAA4bR0czBy89drdPBCMug2pAoJDjI0NwmVj4kETsfCIScipaBmZWajzCkvLhAHkANWl5LQa1DTwtVodjagNfLq8DWyMDL2io0Q1ks-j0ti+AK6Ri8XUGcQSGA2KW26T2WUODCYAFs6OpWNwAKrFTDiG61JQqB7NUCtYxdahRXqWCIyOFzIEIFkmQLgmwRFk2GRRPQItZI5JbNK7TIHKDcABKEgAyhIxDU7lSmk8WogALSBBymcxwwJmn6BKx6Tl2Lz+WZm4UOXwGUWrdaS1I7DL7bLcUr8MoXa4aur3bXPfWG40TBxm4KWS2Wa0eRDRGTTWZ6GTtGSvSwOMUezZetEQSgUdzZI75JhFbiYc4AGSbAE0g1dyZrGo9IwgDUazLH4xarZzzHp7cEugWfEYbLY4qs8KgIHAtMWUdKfRi2BwuN3qTraYg7CZhk5gjMvGbLJzY5mr3ZzIFvl0ixKS6iZb7MbWioeEa6ggXQZt0vQLK6rxeNy962I+IRfJYCywl4H5JF+27onKRzMLi+JQIBvbAT8oJ6F0XQzK+PxGImNj3q6U6uj8oEAmh7qflu3rYdkRE0jo+rOlMQ6muaiZjqmCAOFEYLibYgQsnorxuoiGFcWWFZVn+Jx8ceAnjKCfysfy5HdEpyycl8GavtJZoOLY9jJuhyJStx5YUJWvFhlqxEnv2QkxqJCZJimYyvgyATBGZ-LfMYzmet+8DeT2-GtHqASTiJcZiSFnIdE4tgGEVMI9OC75LkAA */
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
                invoke: {
                  src: "checkUpdate$",
                },
                on: {
                  ANIMATE: {
                    target: "animating",
                  },
                },
              },
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
              PAN_MOVE: {
                target: ".active",
              },
            },
          },
          dollying: {
            initial: "active",
            states: {
              active: {
                on: {
                  DOLLY_MOVE: {
                    cond: "inDebugMode",
                    actions: "dolly",
                  },
                },
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
            // pause / resume animation based on document visibility
            fromDocumentVisibility().pipe(
              switchMap((isDocumentVisible) =>
                isDocumentVisible
                  ? animationFrames().pipe(
                      map(({ timestamp }) => timestamp),
                      scan(
                        (acc, curr) => ({
                          currentTimeStamp: curr,
                          delta: acc.currentTimeStamp
                            ? curr - acc.currentTimeStamp
                            : 0,
                        }),
                        { currentTimeStamp: 0, delta: 0 }
                      ),
                      map(({ delta }) => ({
                        type: "UPDATE",
                        timeDelta: delta,
                      }))
                    )
                  : EMPTY
              )
            ),
          checkUpdate$: () =>
            interval(2000).pipe(map(() => ({ type: "ANIMATE" }))),
        },
        guards: {
          inDebugMode: () => this.debug,
        },
      }
    )
  );
}

export type TopDownControlsService = SimpleInterpreter<
  TopDownControlsMachineContext,
  TopDownControlsMachineEvent
>;
