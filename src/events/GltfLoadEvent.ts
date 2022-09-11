import { Group } from "three";
import { IEvent } from "../utils/types";

export interface GltfLoadEventData {
  oneStoryHouse: Group;
  oneStoryBHouse: Group;
  twoStoryHouse: Group;
  twoStoryBHouse: Group;
  threeStoryHouse: Group;
  threeStoryBHouse: Group;
  fourStoryHouse: Group;
  fourStoryBHouse: Group;
  sixStoryHouse: Group;
}

export class GltfLoadEvent implements IEvent<GltfLoadEventData> {
  type = "gltfLoad";

  constructor(public data: GltfLoadEventData) {}
}
