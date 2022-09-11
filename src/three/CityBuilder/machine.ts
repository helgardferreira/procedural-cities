import { createMachine, interpret } from "xstate";
import { assign } from "@xstate/immer";
import { Vector3 } from "three";
import { CityEdgeViewEventData } from "../../events/CityEdgeViewEvent";
import { SimpleInterpreter } from "../../utils/types";
import { City, CityEdge } from "../City";
import viewer from "../Viewer";

interface CityBuilderMachineContext {
  cities: City[];
}

type CityBuilderMachineEvent =
  | { type: "SPAWN_EDGE"; data: CityEdgeViewEventData }
  | {
      type: "SPAWN";
      data: {
        position: Vector3;
      };
    };

const cityBuilderMachine =
  /** @xstate-layout N4IgpgJg5mDOIC5QGMCWAXAngIQK6oBsIwAnAYgGUAFAQQHUA5RUABwHtYNU2A7ZkAB6IAzAAYAdAEYAbAHYAnNNEAWAEyzRq5ZOUAaEJkSTVAXzP6ebYvCQg0WPIWIlxAQ2TpUANzD92nT15+IQRlWX1DBEkADklxeQT5aOj5TWkk6IBWczsMHHwiUj8OLiDbENVhCKNReXjEhsb5MzMgA */
  createMachine(
    {
      context: { cities: [] },
      tsTypes: {} as import("./machine.typegen").Typegen0,
      schema: {
        context: {} as CityBuilderMachineContext,
        events: {} as CityBuilderMachineEvent,
      },
      predictableActionArguments: true,
      on: {
        SPAWN_EDGE: {
          actions: "spawnCityOnEdges",
        },
      },
      id: "cityBuilder",
      initial: "active",
      states: {
        active: {},
      },
    },
    {
      actions: {
        spawnCityOnEdges: assign((context, { data }) => {
          const { city, edges } = data;
          edges.forEach((edge) => {
            let newCityPosition: Vector3;
            if (edge === CityEdge.NorthEast) {
              console.log("setting position to north east");
              newCityPosition = city.position
                .clone()
                .sub(new Vector3(0, 0, city.size));
            } else if (edge === CityEdge.NorthWest) {
              console.log("setting position to north west");
              newCityPosition = city.position
                .clone()
                .sub(new Vector3(city.size, 0, 0));
            } else if (edge === CityEdge.SouthWest) {
              console.log("setting position to south west");
              newCityPosition = city.position
                .clone()
                .add(new Vector3(0, 0, city.size));
            } else if (edge === CityEdge.SouthEast) {
              console.log("setting position to south east");
              newCityPosition = city.position
                .clone()
                .add(new Vector3(city.size, 0, 0));
            } else if (edge === CityEdge.North) {
              console.log("setting position to north");
              newCityPosition = city.position
                .clone()
                .sub(new Vector3(city.size, 0, city.size));
            } else if (edge === CityEdge.West) {
              console.log("setting position to west");
              newCityPosition = city.position
                .clone()
                .sub(new Vector3(city.size, 0, 0))
                .add(new Vector3(0, 0, city.size));
            } else if (edge === CityEdge.South) {
              console.log("setting position to south");
              newCityPosition = city.position
                .clone()
                .add(new Vector3(city.size, 0, city.size));
            } else {
              console.log("setting position to east");
              newCityPosition = city.position
                .clone()
                .add(new Vector3(city.size, 0, 0))
                .sub(new Vector3(0, 0, city.size));
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
      },
    }
  );

const cityBuilderService = interpret(cityBuilderMachine).start();

export default cityBuilderService;

export type CityBuilderInterpreter = SimpleInterpreter<
  CityBuilderMachineContext,
  CityBuilderMachineEvent
>;
