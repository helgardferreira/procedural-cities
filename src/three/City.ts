import {
  Box3,
  BoxHelper,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Vector3,
} from "three";
import Yoga from "@react-pdf/yoga";
import { ObjectNode } from "./primitives";
import { NoiseFunction2D } from "simplex-noise";
import {
  distinct,
  distinctUntilChanged,
  filter,
  from,
  map,
  reduce,
  skip,
  Subscription,
  switchMap,
} from "rxjs";
import eventBus from "../EventBus";
import { ChangeCameraEvent } from "../events/ChangeCameraEvent";
import viewer from "./Viewer";
import { normalizeNoise } from "../utils/lib";
import { CityEdgeViewEvent } from "../events/CityEdgeViewEvent";
import cityBuilderService from "./CityBuilder/machine";

export enum CityEdge {
  North,
  NorthWest,
  West,
  SouthWest,
  South,
  SouthEast,
  East,
  NorthEast,
}

export interface FrustumableItem {
  object: THREE.Object3D;
  edge: CityEdge;
}

export class City extends ObjectNode {
  private numHouseBlocks = 10;
  private houseBlockSize = 10;
  private houseMargin = 1;
  private floorMaterial: MeshStandardMaterial;
  private subscriptions: Subscription[] = [];
  private frustumableItems: FrustumableItem[] = [];

  public size: number;

  constructor(
    initialPosition: Vector3,
    private floorTextures: Map<string, THREE.Texture>,
    private houseMeshes: Map<string, Group> = new Map(),
    private noise2D: NoiseFunction2D
  ) {
    super(
      undefined,
      undefined,
      Yoga.JUSTIFY_SPACE_BETWEEN,
      Yoga.ALIGN_SPACE_BETWEEN,
      Yoga.FLEX_DIRECTION_ROW,
      Yoga.WRAP_WRAP
    );
    this.size =
      this.numHouseBlocks * this.houseBlockSize +
      this.numHouseBlocks * this.houseMargin * 2;
    this.node.setWidth(this.size * 1_000_000);
    this.node.setHeight(this.size * 1_000_000);

    this.position.copy(initialPosition);

    this.floorMaterial = new MeshStandardMaterial({
      map: this.floorTextures.get("map"),
      aoMap: this.floorTextures.get("aoMap"),
      roughnessMap: this.floorTextures.get("roughnessMap"),
      normalMap: this.floorTextures.get("normalMap"),
    });

    this.createFloor();
    this.createHouses();
    this.addEvents();
  }

  private addEvents = () => {
    const frustumableItems$ = from(this.frustumableItems);
    const cameraCoordinates$ =
      eventBus.ofType<ChangeCameraEvent>("changeCamera");

    const edgesInFrustum$ = cameraCoordinates$.pipe(
      switchMap(() =>
        frustumableItems$.pipe(
          filter(({ object }) => {
            const box = new Box3().setFromObject(object);
            // TODO: deal with direct viewer dependency
            return viewer.orthoFrustum.intersectsBox(box);
          }),
          distinct(({ edge }) => edge),
          reduce<FrustumableItem, CityEdge[]>((acc, curr) => {
            return [...acc, curr.edge];
          }, [])
        )
      ),
      distinctUntilChanged((prev, curr) => {
        if (prev.length !== curr.length) {
          return false;
        }
        let isSame = true;
        for (const [i, prevItem] of prev.entries()) {
          if (!isSame) break;
          isSame = prevItem === curr[i];
        }
        return isSame;
      }),
      map(
        (edges) =>
          new CityEdgeViewEvent({
            edges,
            city: this,
          })
      ),
      skip(1)
    );

    // eventBus.trigger(edgesInFrustum$);
    this.subscriptions.push(
      edgesInFrustum$.subscribe((event) =>
        cityBuilderService.send({
          type: "SPAWN_EDGE",
          data: event.data,
        })
      )
    );
  };

  private createHouses = () => {
    const houseBlocks: ObjectNode[] = [];

    let count = 0;

    const start = performance.now();
    for (let i = 0; i < this.numHouseBlocks; i++) {
      for (let j = 0; j < this.numHouseBlocks; j++) {
        const isHouseBlockFrustumable = this.determineIfFrustumable(i, j);
        const houseBlockEdge = this.determineCityEdge(i, j);

        const houseBlockSeedVector = this.position
          .clone()
          .add(new Vector3(i, 0, j));

        const houseBlock = this.createHouseBlock(houseBlockSeedVector);

        if (isHouseBlockFrustumable) {
          this.frustumableItems.push({
            object: houseBlock,
            edge: houseBlockEdge,
          });
        }

        this.node.insertChild(houseBlock.node, count);
        houseBlocks.push(houseBlock);
        count += 1;
      }
    }
    const delta = performance.now() - start;
    console.log(delta);

    this.node.calculateLayout(this.size, this.size, Yoga.DIRECTION_LTR);

    houseBlocks.forEach((houseBlock) => {
      const { left, top } = houseBlock.node.getComputedLayout();
      houseBlock.position
        .sub(new Vector3(this.size / 2, 0, this.size / 2))
        .add(new Vector3(left / 1_000_000, 0, top / 1_000_000));

      // Offset to account for house mesh bottom centroid
      houseBlock.position.x += 1.2;
      houseBlock.position.z += 1.2;

      this.add(houseBlock);
      if (viewer.debug) {
        this.add(new BoxHelper(houseBlock));
      }
    });
  };

  private determineIfFrustumable = (i: number, j: number) => {
    let isHouseBlockFrustumable;
    if (i === 0 || i === this.numHouseBlocks - 1) {
      isHouseBlockFrustumable = true;
    } else if (j === 0 || j === this.numHouseBlocks - 1) {
      isHouseBlockFrustumable = true;
    } else {
      isHouseBlockFrustumable = false;
    }
    return isHouseBlockFrustumable;
  };

  private determineCityEdge = (i: number, j: number): CityEdge => {
    let edge: CityEdge;
    if (i === 0) {
      if (j === 0) {
        edge = CityEdge.North;
      } else if (j === this.numHouseBlocks - 1) {
        edge = CityEdge.East;
      } else {
        edge = CityEdge.NorthEast;
      }
    } else if (i === this.numHouseBlocks - 1) {
      if (j === 0) {
        edge = CityEdge.West;
      } else if (j === this.numHouseBlocks - 1) {
        edge = CityEdge.South;
      } else {
        edge = CityEdge.SouthWest;
      }
    } else if (j === 0) {
      edge = CityEdge.NorthWest;
    } else if (j === this.numHouseBlocks - 1) {
      edge = CityEdge.SouthEast;
    }
    return edge!;
  };

  private createHouseBlock = (seedVector: Vector3) => {
    const houseBlock = new ObjectNode(
      this.houseBlockSize,
      this.houseBlockSize,
      Yoga.JUSTIFY_SPACE_BETWEEN,
      Yoga.ALIGN_SPACE_BETWEEN,
      Yoga.FLEX_DIRECTION_ROW,
      Yoga.WRAP_WRAP
    );
    houseBlock.node.setMargin(Yoga.EDGE_ALL, this.houseMargin * 1_000_000);

    const houses: ObjectNode[] = [];

    let count = 0;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        let house: ObjectNode;

        const noiseValue = normalizeNoise(
          this.noise2D((seedVector.x + i) * i, (seedVector.z + j) * j)
        );

        if (noiseValue < 1 / 9) {
          house = ObjectNode.fromObject(
            this.houseMeshes.get("oneStoryHouse")!.clone()
          );
        } else if (noiseValue >= 1 / 9 && noiseValue < 2 / 9) {
          house = ObjectNode.fromObject(
            this.houseMeshes.get("oneStoryBHouse")!.clone()
          );
        } else if (noiseValue >= 2 / 9 && noiseValue < 3 / 9) {
          house = ObjectNode.fromObject(
            this.houseMeshes.get("twoStoryHouse")!.clone()
          );
        } else if (noiseValue >= 3 / 9 && noiseValue < 4 / 9) {
          house = ObjectNode.fromObject(
            this.houseMeshes.get("twoStoryBHouse")!.clone()
          );
        } else if (noiseValue >= 4 / 9 && noiseValue < 5 / 9) {
          house = ObjectNode.fromObject(
            this.houseMeshes.get("threeStoryHouse")!.clone()
          );
        } else if (noiseValue >= 5 / 9 && noiseValue < 6 / 9) {
          house = ObjectNode.fromObject(
            this.houseMeshes.get("threeStoryBHouse")!.clone()
          );
        } else if (noiseValue >= 6 / 9 && noiseValue < 7 / 9) {
          house = ObjectNode.fromObject(
            this.houseMeshes.get("fourStoryHouse")!.clone()
          );
        } else if (noiseValue >= 7 / 9 && noiseValue < 8 / 9) {
          house = ObjectNode.fromObject(
            this.houseMeshes.get("fourStoryBHouse")!.clone()
          );
        } else {
          house = ObjectNode.fromObject(
            this.houseMeshes.get("sixStoryHouse")!.clone()
          );
        }

        const houseSize = new Box3()
          .setFromObject(house)
          .getSize(new Vector3());

        house.node.setWidth(houseSize.x * 1_000_000);
        house.node.setHeight(houseSize.z * 1_000_000);
        house.node.setMargin(Yoga.EDGE_ALL, 0.3 * 1_000_000);
        houseBlock.node.insertChild(house.node, count);

        houses.push(house);
        houseBlock.add(house);

        count += 1;
      }
    }

    houseBlock.node.calculateLayout(
      this.houseBlockSize,
      this.houseBlockSize,
      Yoga.DIRECTION_LTR
    );

    houses.forEach((house) => {
      const { left, top } = house.node.getComputedLayout();
      house.position.x = left / 1_000_000;
      house.position.z = top / 1_000_000;

      // houseBlock.add(new THREE.BoxHelper(house));
    });

    return houseBlock;
  };

  private createFloor = () => {
    const floor = new Mesh(
      new PlaneGeometry(this.size, this.size),
      this.floorMaterial
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.02;
    this.add(floor);
  };

  // TODO: work on dispose method
  public dispose = () => {
    this.floorMaterial.dispose();
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  };
}
