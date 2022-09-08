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
  private planeGeometrySize = 100;

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

    // const size = new THREE.Box3().setFromObject(house).getSize(
    //   new THREE.Vector3()
    // ).toArray();

    // const cityPadding = 5;
    // const houseMargin = 1;
    const numHouses = 10;

    const cityNode = Yoga.Node.create();
    cityNode.setWidth(this.planeGeometrySize);
    cityNode.setHeight(this.planeGeometrySize);
    // cityNode.setPadding(Yoga.EDGE_ALL, cityPadding);
    // cityNode.setJustifyContent(Yoga.JUSTIFY_SPACE_BETWEEN);
    cityNode.setJustifyContent(Yoga.JUSTIFY_FLEX_START);
    // cityNode.setAlignContent(Yoga.ALIGN_CENTER);
    cityNode.setAlignContent(Yoga.ALIGN_FLEX_START);
    cityNode.setFlexDirection(Yoga.FLEX_DIRECTION_ROW);
    cityNode.setFlexWrap(Yoga.WRAP_WRAP);

    const currentPosition = this.ortho.position
      .clone()
      .subScalar(this.cameraOffsetScalar);

    currentPosition.x -= this.planeGeometrySize / 2;
    currentPosition.z -= this.planeGeometrySize / 2;

    const houseNodes: YogaNode[] = [];

    for (let i = 0; i < numHouses; i++) {
      const houseNode = Yoga.Node.create();
      // TODO: calculate actual house block dimensions here
      houseNode.setWidth(9.2);
      houseNode.setHeight(9.2);
      // houseNode.setMargin(Yoga.EDGE_ALL, houseMargin);
      cityNode.insertChild(houseNode, i);

      houseNodes.push(houseNode);
    }

    cityNode.calculateLayout(
      this.planeGeometrySize,
      this.planeGeometrySize,
      Yoga.DIRECTION_LTR
    );

    houseNodes.forEach((node, index) => {
      const { left, top } = node.getComputedLayout();
      const position = currentPosition
        .clone()
        .add(new THREE.Vector3(left, 0, top));

      const houseBlock = this.createHouseBlock(position, houses);

      // const houseBlockSize = new THREE.Box3()
      //   .setFromObject(houseBlock)
      //   .getSize(new THREE.Vector3());
      // TODO: try using center house instead of whole block for offset
      // houseBlock.position.x += houseBlockSize.x / 2;
      // houseBlock.position.z += houseBlockSize.z / 2;

      objects.push(houseBlock);
      objects.push(new THREE.BoxHelper(houseBlock));
    });

    return objects;
  };

  private createHouseBlock(
    centerPosition: THREE.Vector3,
    houses: Map<string, THREE.Object3D<THREE.Event>>
  ) {
    const houseBlock = new THREE.Group();
    houseBlock.position.copy(centerPosition);
    let count = 0;

    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        let house: THREE.Object3D;
        const housePosition = new THREE.Vector3(i * 3.3, 0, j * 3.3);
        const noiseValue =
          (noise2D(
            centerPosition.x + housePosition.x,
            centerPosition.z + housePosition.z
          ) *
            100 +
            100) /
          100 /
          2;

        if (noiseValue < 1 / 9) {
          house = houses.get("oneStoryHouse")!.clone();
        } else if (noiseValue >= 1 / 9 && noiseValue < 2 / 9) {
          house = houses.get("oneStoryBHouse")!.clone();
        } else if (noiseValue >= 2 / 9 && noiseValue < 3 / 9) {
          house = houses.get("twoStoryHouse")!.clone();
        } else if (noiseValue >= 3 / 9 && noiseValue < 4 / 9) {
          house = houses.get("twoStoryBHouse")!.clone();
        } else if (noiseValue >= 4 / 9 && noiseValue < 5 / 9) {
          house = houses.get("threeStoryHouse")!.clone();
        } else if (noiseValue >= 5 / 9 && noiseValue < 6 / 9) {
          house = houses.get("threeStoryBHouse")!.clone();
        } else if (noiseValue >= 6 / 9 && noiseValue < 7 / 9) {
          house = houses.get("fourStoryHouse")!.clone();
        } else if (noiseValue >= 7 / 9 && noiseValue < 8 / 9) {
          house = houses.get("fourStoryBHouse")!.clone();
        } else {
          house = houses.get("sixStoryHouse")!.clone();
        }

        // house.position.set(i * 3.3, 0, j * 3.3);
        houseBlock.add(house);
        // houseBlock.add(new THREE.BoxHelper(house));
        house.position.copy(housePosition);
        if (count === 0) {
          const houseSize = new THREE.Box3()
            .setFromObject(house)
            .getSize(new THREE.Vector3());
          houseBlock.position.x += houseSize.x / 2;
          houseBlock.position.z += houseSize.z / 2;
        }

        count += 1;
      }
    }

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
