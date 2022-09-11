import { IEvent } from "../utils/types";

export interface TextureLoadEventData {
  map: THREE.Texture;
  aoMap?: THREE.Texture;
  displacementMap?: THREE.Texture;
  metalnessMap?: THREE.Texture;
  normalMap?: THREE.Texture;
  roughnessMap?: THREE.Texture;
}

export class TextureLoadEvent implements IEvent<TextureLoadEventData> {
  type = "textureLoad";

  constructor(public data: TextureLoadEventData) {}
}
