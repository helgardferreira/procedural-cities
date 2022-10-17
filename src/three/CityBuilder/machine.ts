import { assign, createMachine, interpret } from "xstate";
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

export function createCityBuilderMachine(this: Viewer) {
  return interpret(
    /** @xstate-layout N4IgpgJg5mDOIC5QGMCWAXAngIQK6oBsIwAnAOgENl1UA3MAYgGUAFAQQHUA5AfQFEAIgHE+AbQAMAXUSgADgHtYGVPIB2MkAA9EANgAcAZjIBWPcYCcx4wYMAWYwCZxOgDQhMiBw-Nlbe2wYA7OKmweY6pgC+kW5oWHiExORUNPQMAnwAMnwAKmJSGgpKNGoa2giBAIwOvs4OgXqWBoa25m4eCJUGlWTiff3i9Xo6BiHRsRg4+ESkZATyFBCoqlAMmQDybAI8bExMuUw8AMLrALIs2XkS0kggRcqlt+W2DkaVVWaBOuYh77aB7UQBlMZHCekCth09S64kCEPGIDiU0Ss2WKTojA2Wx2ewO10Kige6ieiEqjjIgTBDQclXMEOqAPcQJBVMh0NGcNs0RiIFU8mI8FuSISM2S1AxBOKKmJoHKOkCNT01WMZMhlUMcMBCBsNSpVkMxls4iVCOF0yScwWSxWkqJZSBZN8-iCSsslO+WuBPkh4MCxh0rUhzVNkxFFrR4votpKMq0iBenosvn0cP9gZGehD8XNpGj0vtCAAtK4mUXjKDzJWq9XK8NuZEgA */
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
          // Can improve on spawnCityOnEdges algorithm efficiency
          spawnCityOnEdges: assign((context, { data }) => {
            const { city, edges } = data;
            const newCities = [...context.cities];
            edges.forEach((edge) => {
              const newCityPosition = calculateOffsetCityPosition(
                edge,
                city.position,
                city.size
              );

              if (
                !newCities.some(
                  (c) =>
                    c.position.toArray().toString() ===
                    newCityPosition.toArray().toString()
                )
              ) {
                const newCity = new City(newCityPosition);
                this.scene.add(newCity);
                newCities.push(newCity);
              }
            });

            return {
              cities: newCities,
            };
          }),
          spawnCity: assign((context) => {
            const city = new City(new Vector3(0, 0, 0));
            this.scene.add(city);

            return {
              cities: context.cities.concat(city),
            };
          }),
          deleteCity: assign((context, { data: { city } }) => ({
            cities: context.cities.filter((c) => c !== city),
          })),
        },
        services: {
          loadAssets$: () =>
            merge(
              eventBus.ofType("textureLoad$").pipe(take(1)),
              eventBus.ofType("gltfLoad$").pipe(take(1))
            ).pipe(
              map(() => ({
                type: "LOAD_ASSETS",
              })),
              endWith({
                type: "LOAD_ASSETS_COMPLETE",
              })
            ),
          cityEdgeView$: () =>
            eventBus.ofType<CityEdgeViewEvent>("cityEdgeView$").pipe(
              map(({ data }) => ({
                type: "SPAWN_EDGE",
                data,
              }))
            ),
          disposeCity$: () =>
            eventBus.ofType<DisposeCityEvent>("disposeCity$").pipe(
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

export type CityBuilderService = SimpleInterpreter<
  CityBuilderMachineContext,
  CityBuilderMachineEvent
>;
