import { City } from "../three/City";
import { IEvent } from "../utils/types";

export interface DisposeCityEventData {
  city: City;
}

export class DisposeCityEvent implements IEvent<DisposeCityEventData> {
  type = "disposeCity";

  constructor(public data: DisposeCityEventData) {}
}
