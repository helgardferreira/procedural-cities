import { City, CityEdge } from "../three/City";
import { IEvent } from "../utils/types";

export interface CityEdgeViewEventData {
  city: City;
  edges: CityEdge[];
}

export class CityEdgeViewEvent implements IEvent<CityEdgeViewEventData> {
  type = "cityEdgeView";

  constructor(public data: CityEdgeViewEventData) {}
}
