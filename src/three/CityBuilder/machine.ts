import { createMachine, interpret } from "xstate";
import { assign } from "@xstate/immer";
import { Vector3 } from "three";
import {
  CityEdgeViewEvent,
  CityEdgeViewEventData,
} from "../../events/CityEdgeViewEvent";
import { SimpleInterpreter } from "../../utils/types";
import { City } from "../City";
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

export function cityBuilderMachineCreator(this: Viewer) {
  /** @xstate-layout N4IgpgJg5mDOIC5QGMCWAXAngIQK6oBsIwAnAOgENl1UA3MAYgGUAFAQQHUA5AfQFEAIgHE+AbQAMAXUSgADgHtYGVPIB2MkAA9EANgAcAZjIBWACz7zAdmMAmS5ZsAaEJkQ2bATjIfLO43oBGPT0PHwDTSwBfSOc0LDxCYnIqGnoGAT4AGT4AFTEpDQUlGjUNbQRLAJsyAx1K02NxcRsA8T0dZ1cEAIMAsiaBm3F7AwNxW2jYjBx8IlIyAnkKCFRVKAZMgHk2AR42JiZcph4AYU2AWRZsvIlpJBAi5VL78tMbI3DDEJsdULqbYydRAGYxeDzGXo6UwBPziAwNUyTEBxGaJearFJ0RhbHZ7A5HW6FRRPdQvRABWxkSwhcQ6Ko6MbhdxAhAgsEQinNCIw2nRGIgVTyYjwe4ohJzZLULFE4oqUmgcr-KnBUJ6H6WUztFmjIzgyEBSzNOk2RH8sWzJILJYrNYykllYEUsjmPSWeE9QJqqHanTiZ0cqEwxrwsxI81o8gYqX0O0leVaRBvH1+hqQ6GwkOmqbxC2kWNyh0IAC0HRciBLfMiQA */
  return interpret(
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
                this.scene.add(newCity);
                context.cities.push(newCity);
              }
            });
          }),
          spawnCity: assign((context) => {
            const city = new City(new Vector3(0, 0, 0));
            this.scene.add(city);
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
    )
  );
}

export type CityBuilderInterpreter = SimpleInterpreter<
  CityBuilderMachineContext,
  CityBuilderMachineEvent
>;
