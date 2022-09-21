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
import { calculateOffsetCityPosition } from "../../utils/lib";
import {
  DisposeCityEvent,
  DisposeCityEventData,
} from "../../events/DisposeCityEvent";

interface CityBuilderMachineContext {
  cities: City[];
}

type CityBuilderMachineEvent =
  | { type: "LOAD_ASSETS" }
  | { type: "LOAD_ASSETS_COMPLETE" }
  | { type: "SPAWN" }
  | { type: "SPAWN_EDGE"; data: CityEdgeViewEventData }
  | { type: "DELETE"; data: DisposeCityEventData };

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
          invoke: [
            {
              src: "cityEdgeView$",
            },
            {
              src: "disposeCity$",
            },
          ],
          on: {
            SPAWN_EDGE: {
              actions: "spawnCityOnEdges",
            },
            DELETE: {
              actions: "deleteCity",
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
            const newCityPosition = calculateOffsetCityPosition(
              edge,
              city.position,
              city.size
            );

            if (
              !context.cities.some(
                (c) =>
                  c.position.toArray().toString() ===
                  newCityPosition.toArray().toString()
              )
            ) {
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
        deleteCity: assign((context, { data: { city } }) => {
          const newCities = context.cities.filter((c) => c !== city);

          if (newCities.length !== context.cities.length) {
            context.cities = newCities;
          }
        }),
      },
      services: {
        loadAssets$: () =>
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
        cityEdgeView$: () =>
          eventBus.ofType<CityEdgeViewEvent>("cityEdgeView").pipe(
            map(({ data }) => ({
              type: "SPAWN_EDGE",
              data,
            }))
          ),
        disposeCity$: () =>
          eventBus.ofType<DisposeCityEvent>("disposeCity").pipe(
            map(({ data }) => ({
              type: "DELETE",
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
