import {
  Box3,
  BoxHelper,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Vector3,
} from "three";
import Yoga from "@react-pdf/yoga";
import { ObjectNode } from "./primitives";
import {
  distinct,
  distinctUntilChanged,
  filter,
  from,
  map,
  Observable,
  reduce,
  shareReplay,
  Subject,
  Subscription,
  switchMap,
  take,
  takeUntil,
} from "rxjs";
import eventBus from "../EventBus";
import { ChangeCameraEvent } from "../events/ChangeCameraEvent";
import viewer from "./Viewer";
import { calculateOffsetCityPosition, normalized2DNoise } from "../utils/lib";
import { CityEdgeViewEvent } from "../events/CityEdgeViewEvent";
import {
  TextureLoadEvent,
  TextureLoadEventData,
} from "../events/TextureLoadEvent";
import { GltfLoadEvent, GltfLoadEventData } from "../events/GltfLoadEvent";
import { DisposeCityEvent } from "../events/DisposeCityEvent";

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
  private houseMeshes?: GltfLoadEventData;
  private destroy$: Subject<void>;

  public size: number;

  constructor(initialPosition: Vector3) {
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

    this.floorMaterial = new MeshStandardMaterial();

    this.destroy$ = new Subject<void>();

    queueMicrotask(() => {
      this.createFloor();
      this.addEvents();
    });
  }

  private addEvents = () => {
    const frustumableItems$ = from(this.frustumableItems);
    const cameraCoordinates$ =
      eventBus.ofType<ChangeCameraEvent>("changeCamera");

    const edgesInFrustum$ = cameraCoordinates$.pipe(
      takeUntil(this.destroy$),
      switchMap(() =>
        frustumableItems$.pipe(
          filter(({ object }) => {
            // N.B. it's important to update the world matrix
            // to avoid the Box3 coordinates from being miscalculated leading
            // to undefined behavior for the frustum detection logic
            object.updateWorldMatrix(true, false);
            const box = new Box3().setFromObject(object);
            // N.B. Box3Helper is only for debugging purposes
            // viewer.scene.add(new Box3Helper(box));
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
      shareReplay()
    );

    eventBus.trigger({
      cityEdgeView: edgesInFrustum$,
    });

    const checkDisposeCity$ = eventBus
      .ofType<CityEdgeViewEvent>("cityEdgeView")
      .pipe(
        takeUntil(this.destroy$),
        map(({ data }) => {
          const { city, edges } = data;

          const box = new Box3().setFromCenterAndSize(
            this.position.clone(),
            new Vector3(this.size, 0, this.size)
          );
          // const boxHelper = new Box3Helper(box);
          // viewer.scene.add(boxHelper);

          if (viewer.orthoFrustum.intersectsBox(box)) {
            return false;
          }

          for (const edge of edges) {
            const cityOffset = calculateOffsetCityPosition(
              edge,
              city.position,
              city.size
            );

            const offsetBox = new Box3().setFromCenterAndSize(
              cityOffset,
              new Vector3(this.size, 0, this.size)
            );
            if (viewer.orthoFrustum.intersectsBox(offsetBox)) {
              return false;
            }
          }

          return true;
        }),
        shareReplay()
      );

    const disposeCity$: Observable<DisposeCityEvent> = checkDisposeCity$.pipe(
      filter((shouldDispose) => shouldDispose),
      map(() => new DisposeCityEvent({ city: this }))
    );

    eventBus.trigger({
      disposeCity: disposeCity$,
    });

    this.subscriptions.push(
      eventBus
        .ofType<TextureLoadEvent>("textureLoad")
        .pipe(take(1))
        .subscribe(({ data }) => this.setTextures(data)),
      eventBus
        .ofType<GltfLoadEvent>("gltfLoad")
        .pipe(take(1))
        .subscribe(({ data }) => {
          this.houseMeshes = data;
          this.createHouses();
        }),
      checkDisposeCity$.subscribe((shouldDispose) => {
        if (shouldDispose) {
          this.dispose();
        }
      })
    );
  };

  private setTextures = (data: TextureLoadEventData) => {
    if (data.map) this.floorMaterial.map = data.map;
    if (data.aoMap) this.floorMaterial.aoMap = data.aoMap;
    if (data.displacementMap) {
      this.floorMaterial.displacementMap = data.displacementMap;
      this.floorMaterial.displacementScale = 0.1;
    }

    if (data.metalnessMap) this.floorMaterial.metalnessMap = data.metalnessMap;
    if (data.roughnessMap) this.floorMaterial.roughnessMap = data.roughnessMap;
    if (data.normalMap) this.floorMaterial.normalMap = data.normalMap;
    this.floorMaterial.needsUpdate = true;
  };

  private createHouses = () => {
    const houseBlocks: ObjectNode[] = [];

    let count = 0;

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

        const noiseValue = normalized2DNoise(
          (seedVector.x + i) * i,
          (seedVector.z + j) * j
        );

        if (noiseValue < 1 / 9) {
          house = ObjectNode.fromObject(
            this.houseMeshes!.oneStoryHouse.clone()
          );
        } else if (noiseValue >= 1 / 9 && noiseValue < 2 / 9) {
          house = ObjectNode.fromObject(
            this.houseMeshes!.oneStoryBHouse.clone()
          );
        } else if (noiseValue >= 2 / 9 && noiseValue < 3 / 9) {
          house = ObjectNode.fromObject(
            this.houseMeshes!.twoStoryHouse.clone()
          );
        } else if (noiseValue >= 3 / 9 && noiseValue < 4 / 9) {
          house = ObjectNode.fromObject(
            this.houseMeshes!.twoStoryBHouse.clone()
          );
        } else if (noiseValue >= 4 / 9 && noiseValue < 5 / 9) {
          house = ObjectNode.fromObject(
            this.houseMeshes!.threeStoryHouse.clone()
          );
        } else if (noiseValue >= 5 / 9 && noiseValue < 6 / 9) {
          house = ObjectNode.fromObject(
            this.houseMeshes!.threeStoryBHouse.clone()
          );
        } else if (noiseValue >= 6 / 9 && noiseValue < 7 / 9) {
          house = ObjectNode.fromObject(
            this.houseMeshes!.fourStoryHouse.clone()
          );
        } else if (noiseValue >= 7 / 9 && noiseValue < 8 / 9) {
          house = ObjectNode.fromObject(
            this.houseMeshes!.fourStoryBHouse.clone()
          );
        } else {
          house = ObjectNode.fromObject(
            this.houseMeshes!.sixStoryHouse.clone()
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
    floor.position.y = -0.04;
    this.add(floor);
  };

  // TODO: work on dispose method
  public dispose = () => {
    this.floorMaterial.dispose();
    this.destroy$.next();
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  };
}
