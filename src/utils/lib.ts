import { createNoise2D } from "simplex-noise";
import { Vector3 } from "three";
import { CityEdge } from "../three/City";

export const noise2D = createNoise2D();

export function normalized2DNoise(x: number, y: number) {
  return (noise2D(x, y) * 100 + 100) / 100 / 2;
}

export function calculateOffsetCityPosition(
  edge: CityEdge,
  cityPosition: Vector3,
  citySize: number
) {
  let calculatedPosition = new Vector3();

  switch (edge) {
    case CityEdge.NorthEast: {
      calculatedPosition = cityPosition
        .clone()
        .sub(new Vector3(0, 0, citySize));
      break;
    }
    case CityEdge.NorthWest: {
      calculatedPosition = cityPosition
        .clone()
        .sub(new Vector3(citySize, 0, 0));
      break;
    }
    case CityEdge.SouthWest: {
      calculatedPosition = cityPosition
        .clone()
        .add(new Vector3(0, 0, citySize));
      break;
    }
    case CityEdge.SouthEast: {
      calculatedPosition = cityPosition
        .clone()
        .add(new Vector3(citySize, 0, 0));
      break;
    }
    case CityEdge.North: {
      calculatedPosition = cityPosition
        .clone()
        .sub(new Vector3(citySize, 0, citySize));
      break;
    }
    case CityEdge.West: {
      calculatedPosition = cityPosition
        .clone()
        .sub(new Vector3(citySize, 0, 0))
        .add(new Vector3(0, 0, citySize));
      break;
    }
    case CityEdge.South: {
      calculatedPosition = cityPosition
        .clone()
        .add(new Vector3(citySize, 0, citySize));
      break;
    }
    case CityEdge.East: {
      calculatedPosition = cityPosition
        .clone()
        .add(new Vector3(citySize, 0, 0))
        .sub(new Vector3(0, 0, citySize));
      break;
    }
    default: {
      calculatedPosition = new Vector3();
    }
  }

  return calculatedPosition;
}
