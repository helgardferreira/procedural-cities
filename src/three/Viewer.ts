import { distinctUntilChanged, fromEvent, map, Subscription } from "rxjs";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { TopDownControls } from "./controls/TopDownControls";
import { createNoise2D } from "simplex-noise";
import Yoga, { YogaNode } from "@react-pdf/yoga";
import * as dat from "dat.gui";

const noise2D = createNoise2D();

export class Viewer {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private subscriptions: Subscription[] = [];
  private clock = new THREE.Clock();
  private topDownControls: TopDownControls;
  // private camera: THREE.PerspectiveCamera;
  private ortho: THREE.OrthographicCamera;
  private orthoSize = 20;
  public debug = true;
  private gui?: dat.GUI;
  private cameraOffsetScalar = 1000;
  private numHouseBlocks = 5;
  private houseBlockSize = 10;
  private planeGeometrySize: number;

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

    // Create and attach controls
    this.topDownControls = new TopDownControls(this.ortho, this.canvas);

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.planeGeometrySize = this.numHouseBlocks * this.houseBlockSize;

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

  get canvas() {
    return this.renderer.domElement;
  }

  public get guiElement() {
    return this.gui?.domElement;
  }

  private createObjects = async () => {
    const objects: THREE.Object3D[] = [];
    const gltfLoader = new GLTFLoader();
    const houses: Map<string, THREE.Object3D> = new Map();

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
      houses.set(
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

    // const cityPadding = 5;
    // const houseMargin = 1;

    const cityNode = Yoga.Node.create();
    cityNode.setWidth(this.planeGeometrySize * 1_000_000);
    cityNode.setHeight(this.planeGeometrySize * 1_000_000);
    // cityNode.setPadding(Yoga.EDGE_ALL, cityPadding);
    cityNode.setJustifyContent(Yoga.JUSTIFY_SPACE_BETWEEN);
    cityNode.setAlignContent(Yoga.ALIGN_SPACE_BETWEEN);
    cityNode.setFlexDirection(Yoga.FLEX_DIRECTION_ROW);
    cityNode.setFlexWrap(Yoga.WRAP_WRAP);

    const currentPosition = this.ortho.position
      .clone()
      .subScalar(this.cameraOffsetScalar);

    currentPosition.x -= this.planeGeometrySize / 2;
    currentPosition.z -= this.planeGeometrySize / 2;

    const houseBlocks: { node: YogaNode; block: THREE.Group }[] = [];

    for (let i = 0; i < this.numHouseBlocks; i++) {
      for (let j = 0; j < this.numHouseBlocks; j++) {
        const houseBlockNode = Yoga.Node.create();
        houseBlockNode.setWidth(this.houseBlockSize * 1_000_000);
        houseBlockNode.setHeight(this.houseBlockSize * 1_000_000);
        // houseNode.setMargin(Yoga.EDGE_ALL, houseMargin);
        houseBlockNode.setJustifyContent(Yoga.JUSTIFY_SPACE_BETWEEN);
        houseBlockNode.setAlignContent(Yoga.ALIGN_SPACE_BETWEEN);
        houseBlockNode.setFlexDirection(Yoga.FLEX_DIRECTION_ROW);
        houseBlockNode.setFlexWrap(Yoga.WRAP_WRAP);
        cityNode.insertChild(houseBlockNode, i);

        const initialPosition = currentPosition
          .clone()
          .add(new THREE.Vector3(i, 0, j));

        const houseBlock = this.createHouseBlock(
          initialPosition,
          houses,
          houseBlockNode
        );

        houseBlocks.push({
          node: houseBlockNode,
          block: houseBlock,
        });
      }
    }

    cityNode.calculateLayout(
      this.planeGeometrySize,
      this.planeGeometrySize,
      Yoga.DIRECTION_LTR
    );

    houseBlocks.forEach(({ node, block }, index) => {
      const { left, top } = node.getComputedLayout();
      const position = currentPosition
        .clone()
        .add(new THREE.Vector3(left / 1_000_000, 0, top / 1_000_000));

      block.position.copy(position);
      block.position.x += 1.2;
      block.position.z += 1.2;

      objects.push(block);
      objects.push(new THREE.BoxHelper(block));
    });

    return objects;
  };

  private createHouseBlock(
    centerPosition: THREE.Vector3,
    houseMeshes: Map<string, THREE.Object3D<THREE.Event>>,
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
          (noise2D(centerPosition.x + i, centerPosition.z + j) * 100 + 100) /
          100 /
          2;

        if (noiseValue < 1 / 9) {
          house = houseMeshes.get("oneStoryHouse")!.clone();
        } else if (noiseValue >= 1 / 9 && noiseValue < 2 / 9) {
          house = houseMeshes.get("oneStoryBHouse")!.clone();
        } else if (noiseValue >= 2 / 9 && noiseValue < 3 / 9) {
          house = houseMeshes.get("twoStoryHouse")!.clone();
        } else if (noiseValue >= 3 / 9 && noiseValue < 4 / 9) {
          house = houseMeshes.get("twoStoryBHouse")!.clone();
        } else if (noiseValue >= 4 / 9 && noiseValue < 5 / 9) {
          house = houseMeshes.get("threeStoryHouse")!.clone();
        } else if (noiseValue >= 5 / 9 && noiseValue < 6 / 9) {
          house = houseMeshes.get("threeStoryBHouse")!.clone();
        } else if (noiseValue >= 6 / 9 && noiseValue < 7 / 9) {
          house = houseMeshes.get("fourStoryHouse")!.clone();
        } else if (noiseValue >= 7 / 9 && noiseValue < 8 / 9) {
          house = houseMeshes.get("fourStoryBHouse")!.clone();
        } else {
          house = houseMeshes.get("sixStoryHouse")!.clone();
        }

        const houseSize = new THREE.Box3()
          .setFromObject(house)
          .getSize(new THREE.Vector3());

        const houseNode = Yoga.Node.create();
        houseNode.setWidth(houseSize.x * 1_000_000);
        houseNode.setHeight(houseSize.z * 1_000_000);
        if ((count + 2) % 3 === 0) {
          houseNode.setMargin(Yoga.EDGE_LEFT, 1 * 1_000_000);
          houseNode.setMargin(Yoga.EDGE_RIGHT, 1 * 1_000_000);
        }
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

  private createPlane = async () => {
    const textureLoader = new THREE.TextureLoader();

    const wrapTexture = (texture: THREE.Texture) => {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.encoding = THREE.sRGBEncoding;
      texture.repeat.set(this.planeGeometrySize, this.planeGeometrySize);
    };

    const floorBase = await textureLoader.loadAsync(
      (
        await import("./assets/textures/hexTile/baseColor.png")
      ).default
    );
    wrapTexture(floorBase);

    const floorAo = await textureLoader.loadAsync(
      (
        await import("./assets/textures/hexTile/ambientOcclusion.png")
      ).default
    );
    wrapTexture(floorAo);

    const floorHeight = await textureLoader.loadAsync(
      (
        await import("./assets/textures/hexTile/height.png")
      ).default
    );
    wrapTexture(floorHeight);

    const floorNormal = await textureLoader.loadAsync(
      (
        await import("./assets/textures/hexTile/normal.png")
      ).default
    );
    wrapTexture(floorNormal);

    const floorRoughness = await textureLoader.loadAsync(
      (
        await import("./assets/textures/hexTile/roughness.png")
      ).default
    );
    wrapTexture(floorRoughness);

    const planeMaterial = new THREE.MeshStandardMaterial({
      map: floorBase,
      aoMap: floorAo,
      roughnessMap: floorRoughness,
      normalMap: floorNormal,
    });

    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(this.planeGeometrySize, this.planeGeometrySize),
      planeMaterial
    );
    plane.rotation.x = -Math.PI / 2;
    plane.position.set(0, -0.02, 0);
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
    const objects = await this.createObjects();
    const plane = await this.createPlane();
    const lights = this.createLights();

    this.scene.add(...objects, plane, ...lights);

    this.addEvents();
  };

  private addEvents = () => {
    const resize$ = fromEvent(window, "resize");
    this.topDownControls.translate.$.pipe(
      map((vector) => ({
        x: vector.x,
        y: vector.y,
        z: vector.z,
      })),
      distinctUntilChanged((prev, curr) => {
        return prev.x === curr.x && prev.y === curr.y && prev.z === curr.z;
      })
    ).subscribe();

    this.subscriptions.push(resize$.subscribe(this.resizeCanvas));
  };

  private resizeCanvas = () => {
    const aspectRatio = window.innerWidth / window.innerHeight;
    // Update camera
    this.ortho.left = (this.orthoSize * aspectRatio) / -2;
    this.ortho.right = (this.orthoSize * aspectRatio) / 2;
    this.ortho.top = this.orthoSize / 2;
    this.ortho.bottom = this.orthoSize / -2;
    this.ortho.updateProjectionMatrix();

    // Update renderer
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  };

  private render = () => {
    this.renderer.render(this.scene, this.ortho);
    const delta = this.clock.getDelta();

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
