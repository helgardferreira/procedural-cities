import { animationFrames, interval, map, scan } from "rxjs";
import { Vector2 } from "three";
import { createMachine, interpret } from "xstate";
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

export function createTopDownControlsMachine(this: TopDownControls) {
  /** @xstate-layout N4IgpgJg5mDOIC5QBcD2AHAIqg7gOwGFU9kAnVAG1gDp0BDPPASzymroGNkmA3MAYgAKAQQByAfQCiozAG0ADAF1EodKlhNuxFSAAeiAKwB2ABzUAzAYCc5owDYbVgCwmATFYA0IAJ6JzD6hcnWxt7A3MARlcDAF8YrzQsXEJiMkoaekYWNk5uPiExcQBZAHkANUkFZSQQNQ0tPB19BHNXI2o7Iys7JwN5UJMrcK9fBFd5COoraZm7Ownoo1j4kETsfCIScipaBmZWdmYAWzpuVn4AVUFMYQAVSqUdOs0mbRrm8xNJ1yd5J3-5PJPtZLCNDD8On87OYrECrK4It04gkMOsUlt0rssucAEqSADKkluVSe6heb1AzSMrjBCDCgTsJlMfXk7i+dmRq1RyU2aR2mX2UH4YgAkkU7g9qqoyQ0mohqbT5gYpoyjK0In9XOYXJy1jzUtsMntsgUJKUKiSas9Ze95TSfH5foETMETIC3GrOrruRsDZiIJQKN4TZgSgAZMMATWK5UlpPqr0atrp9tG8LMTlVRjV0QMvQicRWeFQEDgOj1vox-ONByYEAoYHj5KTlPl8naBgiBjsCIiJhhrnctNs7SCIWhRi7riZ3qSlb5RuxOS4vEbVpliblYwiTgsIOhTisO6iP2H8mVY7cbSMC3kHJWFfRC6xgsOTBOZygTZtrbGWo6O5LHefznlEirWBYPQalqGpDCY94onOT6Gi+2Tfpuyang6CARBE5jUIChGDAsR6tLOaK8ihAYUEG2TsCufDoRSeh+D2UwurY5j+F8nyeNhQyuNQvaEZ8vxMghXJIZR-qBsGrBMS2LFjE4tL9lYDJMvB3adBqRjkfqVbwOuCbMc0AC0WGjBChGAtSVguoyzhOIWMRAA */
  return interpret(
    /** @xstate-layout N4IgpgJg5mDOIC5QBcD2AHAIqg7gOwGFU9kAnVAG1gDp0BDPPASzymroGNkmA3MAYgAKAQQByAfQCiozAG0ADAF1EodKlhNuxFSAAeiAKwB2ABzUAzAYCc5gGxWAjJfPn55gDQgAnonMAmB2oAFhMgyyt5IyDbeRsAXzjPNCxcQmIyShp6RhY2Tm4+ITFxAFkAeQA1SQVlJBA1DS08HX0EfyNqWyMrW1CDLttbAwdbTx8EBwNzaitZ2amg4eH5IISkjGx8IhJyKloGZlZ2ZgBbOm5WfgBVQUxhABVqpR0GzSZtOta-PysZ+Vs-GFYoMgvI3GNEEFosFQuYgg4-N15AFbOY1iBkps0jtMvscpcAEqSADKknuNRe6jeH1ArSMfghCCMDg60RMg3s-gCIXRmNS2wye2yhyg-DEAEkSg8nrVVFSmi1EPTGQZjDNel0-Bq3IjeRt+eldlkDrkihJylUKXVXgrPkqGd5ED8-DCwrYwgYtX4TFY9SktobcRBKBQvKbMGUADKRgCapUqMspjXezTtTId4xMJnkwQ1RnMWZM3pZCUSIDwqAgcB0fIDOKFJqOTAgFDASepqdpSsi1CWMXM+ZZvRMjPMTld4SsPqnVlWZdr2MFxvxeS4vDb1vlKcVCG5FmsoO9+YBqIzTrVITC9NnzPMVi1fqxAqNeJFxyYZwuUHbtq7u4cQT7rOyImMeWr+CqQS-D07LHvIAEIiYj4GvWy4ij+25poCjLujMczzNY3xTL6876nWS7UMGFChrk7BrnwGE0novgAjMsKRCyDiRCsjIRIBATyCYDgOEW0SCQ4yHkS+VE0awjGdsxu5BIy3SBGygyuLEkzMpJi5GvJO4ALTYY6CDGXOCRAA */
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
