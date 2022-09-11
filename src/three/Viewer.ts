import {
  distinct,
  distinctUntilChanged,
  filter,
  from,
  fromEvent,
  map,
  reduce,
  Subscription,
  switchMap,
} from "rxjs";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { TopDownControls } from "./controls/TopDownControls";
import { createNoise2D } from "simplex-noise";
import Yoga, { YogaNode } from "@react-pdf/yoga";
import * as dat from "dat.gui";

const noise2D = createNoise2D();

enum CityEdge {
  North,
  NorthWest,
  West,
  SouthWest,
  South,
  SouthEast,
  East,
  NorthEast,
}

interface FrustumableItem {
  object: THREE.Object3D;
  edge: CityEdge;
}

export class Viewer {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private clock = new THREE.Clock();

  private topDownControls: TopDownControls;
  private ortho: THREE.OrthographicCamera;
  private orthoHelper?: THREE.CameraHelper;
  private orthoSize = 20;
  private orthoFrustum: THREE.Frustum;
  private frustumableItems: FrustumableItem[] = [];

  private cameraOffsetScalar = 1000;
  private houseMeshes: Map<string, THREE.Object3D> = new Map();
  private floorTextures: Map<string, THREE.Texture> = new Map();

  private numHouseBlocks = 10;
  private houseBlockSize = 10;
  private houseMargin = 1;
  private planeGeometrySize: number;

  private subscriptions: Subscription[] = [];

  private gui?: dat.GUI;

  public debug = true;

  constructor() {
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.outputEncoding = THREE.sRGBEncoding;

    this.scene = new THREE.Scene();
    const aspectRatio = window.innerWidth / window.innerHeight;
    this.ortho = new THREE.OrthographicCamera(
      (this.orthoSize * aspectRatio) / -2,
      (this.orthoSize * aspectRatio) / 2,
      this.orthoSize / 2,
      this.orthoSize / -2,
      0.1,
      10000
    );
    this.ortho.position.addScalar(this.cameraOffsetScalar);
    this.ortho.lookAt(0, 0, 0);
    this.orthoFrustum = new THREE.Frustum();
    this.updateOrthoFrustum();

    if (this.debug) {
      this.orthoHelper = new THREE.CameraHelper(this.ortho);
      this.scene.add(this.orthoHelper);
    }

    // Create and attach controls
    this.topDownControls = new TopDownControls(this.ortho, this.canvas);

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.planeGeometrySize =
      this.numHouseBlocks * this.houseBlockSize +
      this.numHouseBlocks * this.houseMargin * 2;

    // debug GUI
    if (this.debug) {
      this.gui = new dat.GUI({
        autoPlace: false,
      });
      this.gui.close();
      this.gui.width = 500;

      document.body.appendChild(this.guiElement!);
    }

    this.init();

    this.render();
  }

  public get canvas() {
    return this.renderer.domElement;
  }

  public get guiElement() {
    return this.gui?.domElement;
  }

  private updateOrthoFrustum = () => {
    this.orthoFrustum.setFromProjectionMatrix(
      new THREE.Matrix4().multiplyMatrices(
        this.ortho.projectionMatrix,
        this.ortho.matrixWorldInverse
      )
    );
  };

  private loadMeshes = async () => {
    const gltfLoader = new GLTFLoader();

    const houseMeshUrls = [
      ["oneStoryHouse", "1Story"],
      ["oneStoryBHouse", "1StoryB"],
      ["twoStoryHouse", "2Story"],
      ["twoStoryBHouse", "2StoryB"],
      ["threeStoryHouse", "3Story"],
      ["threeStoryBHouse", "3StoryB"],
      ["fourStoryHouse", "4Story"],
      ["fourStoryBHouse", "4StoryB"],
      ["sixStoryHouse", "6Story"],
    ];

    for (const [name, fileName] of houseMeshUrls) {
      this.houseMeshes.set(
        name,
        (
          await gltfLoader.loadAsync(
            (
              await import(`./assets/models/${fileName}.glb`)
            ).default
          )
        ).scene
      );
    }
  };

  private createObjects = (currentPosition: THREE.Vector3) => {
    const city = new THREE.Group();
    const objects: THREE.Object3D[] = [];

    const plane = this.createPlane(currentPosition);
    objects.push(plane);

    const centerPosition = currentPosition.clone();
    centerPosition.x -= this.planeGeometrySize / 2;
    centerPosition.z -= this.planeGeometrySize / 2;

    const cityNode = Yoga.Node.create();
    cityNode.setWidth(this.planeGeometrySize * 1_000_000);
    cityNode.setHeight(this.planeGeometrySize * 1_000_000);
    // cityNode.setPadding(Yoga.EDGE_ALL, cityPadding);
    cityNode.setJustifyContent(Yoga.JUSTIFY_SPACE_BETWEEN);
    // cityNode.setJustifyContent(Yoga.JUSTIFY_FLEX_START);
    cityNode.setAlignContent(Yoga.ALIGN_SPACE_BETWEEN);
    // cityNode.setAlignContent(Yoga.ALIGN_FLEX_START);
    cityNode.setFlexDirection(Yoga.FLEX_DIRECTION_ROW);
    cityNode.setFlexWrap(Yoga.WRAP_WRAP);

    const houseBlocks: { node: YogaNode; block: THREE.Group }[] = [];

    let count = 0;
    for (let i = 0; i < this.numHouseBlocks; i++) {
      for (let j = 0; j < this.numHouseBlocks; j++) {
        let isHouseBlockFrustumable;
        if (i === 0 || i === this.numHouseBlocks - 1) {
          isHouseBlockFrustumable = true;
        } else if (j === 0 || j === this.numHouseBlocks - 1) {
          isHouseBlockFrustumable = true;
        } else {
          isHouseBlockFrustumable = false;
        }

        let houseBlockEdge: CityEdge;
        if (i === 0) {
          if (j === 0) {
            houseBlockEdge = CityEdge.North;
          } else if (j === this.numHouseBlocks - 1) {
            houseBlockEdge = CityEdge.East;
          } else {
            houseBlockEdge = CityEdge.NorthEast;
          }
        } else if (i === this.numHouseBlocks - 1) {
          if (j === 0) {
            houseBlockEdge = CityEdge.West;
          } else if (j === this.numHouseBlocks - 1) {
            houseBlockEdge = CityEdge.South;
          } else {
            houseBlockEdge = CityEdge.SouthWest;
          }
        } else if (j === 0) {
          houseBlockEdge = CityEdge.NorthWest;
        } else if (j === this.numHouseBlocks - 1) {
          houseBlockEdge = CityEdge.SouthEast;
        }

        const houseBlockNode = Yoga.Node.create();
        houseBlockNode.setWidth(this.houseBlockSize * 1_000_000);
        houseBlockNode.setHeight(this.houseBlockSize * 1_000_000);
        houseBlockNode.setMargin(Yoga.EDGE_ALL, this.houseMargin * 1_000_000);
        houseBlockNode.setJustifyContent(Yoga.JUSTIFY_SPACE_BETWEEN);
        // houseBlockNode.setJustifyContent(Yoga.JUSTIFY_FLEX_START);
        houseBlockNode.setAlignContent(Yoga.ALIGN_SPACE_BETWEEN);
        // houseBlockNode.setAlignContent(Yoga.ALIGN_FLEX_START);
        houseBlockNode.setFlexDirection(Yoga.FLEX_DIRECTION_ROW);
        houseBlockNode.setFlexWrap(Yoga.WRAP_WRAP);
        cityNode.insertChild(houseBlockNode, count);

        const initialPosition = centerPosition
          .clone()
          .add(new THREE.Vector3(i, 0, j));

        const houseBlock = this.createHouseBlock(
          initialPosition,
          houseBlockNode
        );
        if (isHouseBlockFrustumable) {
          this.frustumableItems.push({
            object: houseBlock,
            edge: houseBlockEdge!,
          });
        }

        houseBlocks.push({
          node: houseBlockNode,
          block: houseBlock,
        });
        count += 1;
      }
    }

    cityNode.calculateLayout(
      this.planeGeometrySize,
      this.planeGeometrySize,
      Yoga.DIRECTION_LTR
    );

    houseBlocks.forEach(({ node, block }) => {
      const { left, top } = node.getComputedLayout();
      const position = centerPosition
        .clone()
        .add(new THREE.Vector3(left / 1_000_000, 0, top / 1_000_000));

      block.position.copy(position);
      block.position.x += 1.2;
      block.position.z += 1.2;

      city.add(block);
      // city.add(new THREE.BoxHelper(block));
    });
    objects.push(city);

    return objects;
  };

  private createHouseBlock(
    blockPosition: THREE.Vector3,
    houseBlockNode: YogaNode
  ) {
    const houseBlock = new THREE.Group();
    let count = 0;

    const houses: {
      node: YogaNode;
      house: THREE.Object3D<THREE.Event>;
    }[] = [];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        let house: THREE.Object3D;

        const noiseValue =
          (noise2D(blockPosition.x + i, blockPosition.z + j) * 100 + 100) /
          100 /
          2;

        if (noiseValue < 1 / 9) {
          house = this.houseMeshes.get("oneStoryHouse")!.clone();
        } else if (noiseValue >= 1 / 9 && noiseValue < 2 / 9) {
          house = this.houseMeshes.get("oneStoryBHouse")!.clone();
        } else if (noiseValue >= 2 / 9 && noiseValue < 3 / 9) {
          house = this.houseMeshes.get("twoStoryHouse")!.clone();
        } else if (noiseValue >= 3 / 9 && noiseValue < 4 / 9) {
          house = this.houseMeshes.get("twoStoryBHouse")!.clone();
        } else if (noiseValue >= 4 / 9 && noiseValue < 5 / 9) {
          house = this.houseMeshes.get("threeStoryHouse")!.clone();
        } else if (noiseValue >= 5 / 9 && noiseValue < 6 / 9) {
          house = this.houseMeshes.get("threeStoryBHouse")!.clone();
        } else if (noiseValue >= 6 / 9 && noiseValue < 7 / 9) {
          house = this.houseMeshes.get("fourStoryHouse")!.clone();
        } else if (noiseValue >= 7 / 9 && noiseValue < 8 / 9) {
          house = this.houseMeshes.get("fourStoryBHouse")!.clone();
        } else {
          house = this.houseMeshes.get("sixStoryHouse")!.clone();
        }

        const houseSize = new THREE.Box3()
          .setFromObject(house)
          .getSize(new THREE.Vector3());

        const houseNode = Yoga.Node.create();
        houseNode.setWidth(houseSize.x * 1_000_000);
        houseNode.setHeight(houseSize.z * 1_000_000);
        houseNode.setMargin(Yoga.EDGE_ALL, 0.3 * 1_000_000);
        houseBlockNode.insertChild(houseNode, count);

        houses.push({
          node: houseNode,
          house,
        });
        houseBlock.add(house);

        count += 1;
      }
    }

    houseBlockNode.calculateLayout(10, 10, Yoga.DIRECTION_LTR);

    houses.forEach(({ node, house }) => {
      const { left, top } = node.getComputedLayout();
      house.position.x = left / 1_000_000;
      house.position.z = top / 1_000_000;

      // houseBlock.add(new THREE.BoxHelper(house));
    });

    return houseBlock;
  }

  private loadTextures = async () => {
    const textureLoader = new THREE.TextureLoader();

    const wrapTexture = (texture: THREE.Texture) => {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.encoding = THREE.sRGBEncoding;
      texture.repeat.set(this.planeGeometrySize, this.planeGeometrySize);
    };

    const floorTextureUrls = [
      ["map", "baseColor"],
      ["aoMap", "ambientOcclusion"],
      ["displacementMap", "height"],
      ["normalMap", "normal"],
      ["roughnessMap", "roughness"],
    ];

    for (const [name, fileName] of floorTextureUrls) {
      const texture = await textureLoader.loadAsync(
        (
          await import(`./assets/textures/hexTile/${fileName}.png`)
        ).default
      );
      wrapTexture(texture);
      this.floorTextures.set(name, texture);
    }
  };

  private createPlane = (position: THREE.Vector3) => {
    const planeMaterial = new THREE.MeshStandardMaterial({
      map: this.floorTextures.get("map"),
      aoMap: this.floorTextures.get("aoMap"),
      roughnessMap: this.floorTextures.get("roughnessMap"),
      normalMap: this.floorTextures.get("normalMap"),
    });

    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(this.planeGeometrySize, this.planeGeometrySize),
      planeMaterial
    );
    plane.rotation.x = -Math.PI / 2;
    plane.position.set(position.x, -0.02, position.z);
    return plane;
  };

  private createLights = () => {
    const lights: THREE.Light[] = [];

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(0, 50, 100);
    const targetObject = new THREE.Object3D();
    targetObject.position.set(0, 0, 0);
    this.scene.add(targetObject);
    directionalLight.target = targetObject;

    const hemisphereLight = new THREE.HemisphereLight(0x7474a4, 0x080820, 1);
    this.scene.add(hemisphereLight);
    if (this.gui) {
      const lightsGui = this.gui.addFolder("lights");
      lightsGui.closed = false;

      lightsGui.add(directionalLight, "intensity").min(0).max(10);

      lightsGui.add(directionalLight.position, "x").min(-1000).max(1000);
      lightsGui.add(directionalLight.position, "y").min(-1000).max(1000);
      lightsGui.add(directionalLight.position, "z").min(-1000).max(1000);

      lightsGui
        .add(targetObject.position, "x")
        .name("light target x")
        .min(-1000)
        .max(1000);
      lightsGui
        .add(targetObject.position, "y")
        .name("light target y")
        .min(-1000)
        .max(1000);
      lightsGui
        .add(targetObject.position, "z")
        .name("light target z")
        .min(-1000)
        .max(1000);

      lightsGui
        .addColor({ color: hemisphereLight.color.getHex() }, "color")
        .name("hemisphere light color")
        .onChange((color) => {
          hemisphereLight.color.set(color);
        });
      lightsGui
        .addColor(
          { groundColor: hemisphereLight.groundColor.getHex() },
          "groundColor"
        )
        .name("hemisphere light ground color")
        .onChange((color) => {
          hemisphereLight.groundColor.set(color);
        });
    }

    lights.push(directionalLight);
    return lights;
  };

  private init = async () => {
    await this.loadMeshes();
    await this.loadTextures();

    const currentPosition = new THREE.Vector3();
    this.scene.add(...this.createObjects(currentPosition));

    const lights = this.createLights();

    this.scene.add(...lights);

    this.addEvents();
  };

  private addEvents = () => {
    const resize$ = fromEvent(window, "resize");

    const cameraCoordinates$ = this.topDownControls.translate.$.pipe(
      map((vector) => ({
        x: vector.x,
        y: vector.y,
        z: vector.z,
      })),
      distinctUntilChanged((prev, curr) => {
        return prev.x === curr.x && prev.y === curr.y && prev.z === curr.z;
      })
    );

    const frustumableItems$ = from(this.frustumableItems);

    const edgesInFrustum$ = cameraCoordinates$.pipe(
      switchMap(() =>
        frustumableItems$.pipe(
          filter(({ object }) => {
            const box = new THREE.Box3().setFromObject(object);
            return this.orthoFrustum.intersectsBox(box);
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
      })
    );

    this.subscriptions.push(
      resize$.subscribe(this.resizeCanvas),
      cameraCoordinates$.subscribe(() => {
        this.ortho.updateProjectionMatrix();
        this.updateOrthoFrustum();
      }),
      edgesInFrustum$.subscribe((items) => {
        console.log(items);
      })
    );
  };

  private resizeCanvas = () => {
    const aspectRatio = window.innerWidth / window.innerHeight;
    // Update camera
    this.ortho.left = (this.orthoSize * aspectRatio) / -2;
    this.ortho.right = (this.orthoSize * aspectRatio) / 2;
    this.ortho.top = this.orthoSize / 2;
    this.ortho.bottom = this.orthoSize / -2;
    this.ortho.updateProjectionMatrix();
    this.updateOrthoFrustum();

    // Update renderer
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  };

  private render = () => {
    this.renderer.render(this.scene, this.ortho);
    const delta = this.clock.getDelta();

    if (this.debug && this.orthoHelper) {
      this.orthoHelper.update();
    }

    // required if controls.enableDamping or controls.autoRotate are set to true
    this.topDownControls.update();

    requestAnimationFrame(this.render);
  };

  public dispose = () => {
    this.renderer.dispose();
    this.topDownControls.dispose();

    this.subscriptions.forEach((sub) => sub.unsubscribe());
    if (this.guiElement) {
      document.body.removeChild(this.guiElement);
    }
  };
}

let viewer = new Viewer();

export default viewer;
