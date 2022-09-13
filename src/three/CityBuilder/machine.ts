import { createMachine } from "xstate";
import { assign } from "@xstate/immer";
import { Vector3 } from "three";
import {
  CityEdgeViewEvent,
  CityEdgeViewEventData,
} from "../../events/CityEdgeViewEvent";
import { SimpleInterpreter } from "../../utils/types";
import { City, CityEdge } from "../City";
import { Viewer } from "../Viewer";
import eventBus from "../../EventBus";
import { endWith, map, merge, take } from "rxjs";

interface CityBuilderMachineContext {
  cities: City[];
}

type CityBuilderMachineEvent =
  | { type: "LOAD_ASSETS" }
  | { type: "LOAD_ASSETS_COMPLETE" }
  | { type: "SPAWN" }
  | { type: "SPAWN_EDGE"; data: CityEdgeViewEventData };

export const cityBuilderMachineCreator = (viewer: Viewer) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QGMCWAXAngIQK6oBsIwAnAOgENl1UA3MAYgGUAFAQQHUA5AfQFEAIgHE+iUAAcA9rAypJAOzEgAHogBsagMxkNAFgAMAVgCMAdgBMATn0AOS5YA0ITImMGy9+zdOXNbtfrmAL5BTmhYeITE5ASSFBCo8lAMADIA8mwCPGxMTHwAKkw8AMJpALIsKQWiSCBSMjQKSqoIusbGZKbG3ubmNsZq5qa6NmpOLgjmumo6Gho2Q4a6FjaaIWEYOPhEpGSJVDT0qRlZOXmFSvWyTbUtxob6ZHb6am691tYv44hTM3Pzi2WfTW6xA8kkxHgtXCWyiuwOdDAl2k10Ut3Uhm0mkMvjUq00700pm+kwJHk83l8-kCoJhkR2MTiCSSyIacjRoBamiMZEMpn6bys+k+mhJUw6Aw0hhxakMozetM29Oie3kCPorNRzUQunMYraZElsplcteusVEW20U1jQ5KlcNhJ3RCISAA */
  createMachine(
    {
      context: { cities: [] },
      tsTypes: {} as import("./machine.typegen").Typegen0,
      schema: {
        context: {} as CityBuilderMachineContext,
        events: {} as CityBuilderMachineEvent,
      },
      predictableActionArguments: true,
      invoke: {
        src: "loadAssets$",
      },
      id: "cityBuilder",
      initial: "inactive",
      states: {
        active: {
          entry: "spawnCity",
          invoke: {
            src: "cityEdgeView$",
          },
          on: {
            SPAWN_EDGE: {
              actions: "spawnCityOnEdges",
            },
          },
        },
        loading: {
          on: {
            LOAD_ASSETS_COMPLETE: {
              target: "active",
            },
          },
        },
        inactive: {
          on: {
            LOAD_ASSETS: {
              target: "loading",
            },
          },
        },
      },
    },
    {
      actions: {
        spawnCityOnEdges: assign((context, { data }) => {
          const { city, edges } = data;
          edges.forEach((edge) => {
            let newCityPosition: Vector3;

            switch (edge) {
              case CityEdge.NorthEast: {
                newCityPosition = city.position
                  .clone()
                  .sub(new Vector3(0, 0, city.size));
                break;
              }
              case CityEdge.NorthWest: {
                newCityPosition = city.position
                  .clone()
                  .sub(new Vector3(city.size, 0, 0));
                break;
              }
              case CityEdge.SouthWest: {
                newCityPosition = city.position
                  .clone()
                  .add(new Vector3(0, 0, city.size));
                break;
              }
              case CityEdge.SouthEast: {
                newCityPosition = city.position
                  .clone()
                  .add(new Vector3(city.size, 0, 0));
                break;
              }
              case CityEdge.North: {
                newCityPosition = city.position
                  .clone()
                  .sub(new Vector3(city.size, 0, city.size));
                break;
              }
              case CityEdge.West: {
                newCityPosition = city.position
                  .clone()
                  .sub(new Vector3(city.size, 0, 0))
                  .add(new Vector3(0, 0, city.size));
                break;
              }
              case CityEdge.South: {
                newCityPosition = city.position
                  .clone()
                  .add(new Vector3(city.size, 0, city.size));
                break;
              }
              case CityEdge.East: {
                newCityPosition = city.position
                  .clone()
                  .add(new Vector3(city.size, 0, 0))
                  .sub(new Vector3(0, 0, city.size));
                break;
              }
              default: {
                newCityPosition = new Vector3();
              }
            }

            if (
              !context.cities.some(
                (c) =>
                  c.position.toArray().toString() ===
                  newCityPosition.toArray().toString()
              )
            ) {
              // TODO: move city generation to observable and to job task queue
              console.log("spawning city!");
              const newCity = new City(newCityPosition);

              viewer.scene.add(newCity);

              context.cities.push(newCity);
            }
          });
        }),
        spawnCity: assign((context) => {
          const city = new City(new Vector3(0, 0, 0));
          viewer.scene.add(city);
          context.cities.push(city);
        }),
      },
      services: {
        loadAssets$: (context) =>
          merge(
            eventBus.ofType("textureLoad").pipe(take(1)),
            eventBus.ofType("gltfLoad").pipe(take(1))
          ).pipe(
            map(() => ({
              type: "LOAD_ASSETS",
            })),
            endWith({
              type: "LOAD_ASSETS_COMPLETE",
            })
          ),
        cityEdgeView$: (context) =>
          eventBus.ofType<CityEdgeViewEvent>("cityEdgeView").pipe(
            map(({ data }) => ({
              type: "SPAWN_EDGE",
              data,
            }))
          ),
      },
    }
  );

export type CityBuilderInterpreter = SimpleInterpreter<
  CityBuilderMachineContext,
  CityBuilderMachineEvent
>;
