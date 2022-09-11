import { fromEvent, Subscription } from "rxjs";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { TopDownControls } from "./controls/TopDownControls";
import { createNoise2D } from "simplex-noise";
import * as dat from "dat.gui";
import { City } from "./City";
import eventBus from "../EventBus";
import { ChangeCameraEvent } from "../events/ChangeCameraEvent";

export class Viewer {
  private renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  private clock = new THREE.Clock();

  private topDownControls: TopDownControls;
  private ortho: THREE.OrthographicCamera;
  private orthoHelper?: THREE.CameraHelper;
  private orthoSize = 20;
  // TODO: change frustum access modifier to private
  public orthoFrustum: THREE.Frustum;
  private city?: City;

  private cameraOffsetScalar = 1000;
  public houseMeshes: Map<string, THREE.Group> = new Map();
  public floorTextures: Map<string, THREE.Texture> = new Map();

  private numHouseBlocks = 10;
  private houseBlockSize = 10;
  private houseMargin = 1;
  private planeGeometrySize: number;

  private subscriptions: Subscription[] = [];

  private gui?: dat.GUI;

  public debug = false;

  public noise2D = createNoise2D();

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

    this.debug = localStorage.getItem("debug") === "true";

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

  private createObjects = (initialCityPosition: THREE.Vector3) => {
    const objects: THREE.Object3D[] = [];

    this.city = new City(
      initialCityPosition,
      this.floorTextures,
      this.houseMeshes,
      this.noise2D
    );

    objects.push(this.city);

    return objects;
  };

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

    this.subscriptions.push(
      resize$.subscribe(this.resizeCanvas),
      eventBus.ofType<ChangeCameraEvent>("changeCamera").subscribe(() => {
        this.ortho.updateProjectionMatrix();
        this.updateOrthoFrustum();
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
