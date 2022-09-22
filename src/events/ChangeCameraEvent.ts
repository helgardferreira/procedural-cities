import { Frustum } from "three";
import { IEvent } from "../utils/types";

export interface ChangeCameraEventData {
  x: number;
  y: number;
  z: number;
  cameraFrustum: Frustum;
}

export class ChangeCameraEvent implements IEvent<ChangeCameraEventData> {
  type = "changeCamera";

  constructor(public data: ChangeCameraEventData) {}
}
