import { fromEvent, Subscription } from "rxjs";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { TopDownControls } from "./controls/TopDownControls";
import { createNoise4D } from "simplex-noise";
import * as dat from "dat.gui";

const noise4D = createNoise4D();

export class Viewer {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private subscriptions: Subscription[] = [];
  private clock = new THREE.Clock();
  private topDownControls: TopDownControls;
  // private camera: THREE.PerspectiveCamera;
  private ortho: THREE.OrthographicCamera;
  private orthoSize = 15;
  public debug = true;
  private gui?: dat.GUI;

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
      1000
    );
    this.ortho.position.set(40, 40, 40);
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

    const oneStoryHouse = (
      await gltfLoader.loadAsync(
        (
          await import("./assets/models/1Story.glb")
        ).default
      )
    ).scene;

    const oneStoryBHouse = (
      await gltfLoader.loadAsync(
        (
          await import("./assets/models/1StoryB.glb")
        ).default
      )
    ).scene;

    const twoStoryHouse = (
      await gltfLoader.loadAsync(
        (
          await import("./assets/models/2Story.glb")
        ).default
      )
    ).scene;

    const twoStoryBHouse = (
      await gltfLoader.loadAsync(
        (
          await import("./assets/models/2StoryB.glb")
        ).default
      )
    ).scene;

    const threeStoryHouse = (
      await gltfLoader.loadAsync(
        (
          await import("./assets/models/3Story.glb")
        ).default
      )
    ).scene;

    const threeStoryBHouse = (
      await gltfLoader.loadAsync(
        (
          await import("./assets/models/3StoryB.glb")
        ).default
      )
    ).scene;

    const fourStoryHouse = (
      await gltfLoader.loadAsync(
        (
          await import("./assets/models/4Story.glb")
        ).default
      )
    ).scene;

    const fourStoryBHouse = (
      await gltfLoader.loadAsync(
        (
          await import("./assets/models/4StoryB.glb")
        ).default
      )
    ).scene;

    const sixStoryHouse = (
      await gltfLoader.loadAsync(
        (
          await import("./assets/models/6Story.glb")
        ).default
      )
    ).scene;

    // const box = new THREE.Box3().setFromObject(oneStoryHouse);
    // const size = box.getSize(new THREE.Vector3());
    // console.log(size.toArray());

    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        let house: THREE.Object3D;
        const random = Math.random();
        if (random < 1 / 9) {
          house = oneStoryHouse.clone();
        } else if (random >= 1 / 9 && random < 2 / 9) {
          house = oneStoryBHouse.clone();
        } else if (random >= 2 / 9 && random < 3 / 9) {
          house = twoStoryHouse.clone();
        } else if (random >= 3 / 9 && random < 4 / 9) {
          house = twoStoryBHouse.clone();
        } else if (random >= 4 / 9 && random < 5 / 9) {
          house = threeStoryHouse.clone();
        } else if (random >= 5 / 9 && random < 6 / 9) {
          house = threeStoryBHouse.clone();
        } else if (random >= 6 / 9 && random < 7 / 9) {
          house = fourStoryHouse.clone();
        } else if (random >= 7 / 9 && random < 8 / 9) {
          house = fourStoryBHouse.clone();
        } else {
          house = sixStoryHouse.clone();
        }

        house.position.set(i * 3.3, 0, j * 3.3);
        objects.push(house);
        // objects.push(new THREE.BoxHelper(house));
      }
    }

    // objects.push(mesh);

    /* const cubeMaterial = new THREE.MeshStandardMaterial();

    const cubeHeight = 1;
    const cubeWidth = 1;
    const alleySize = 0.25;

    const noiseMultiplier = 10;

    let count = 0;

    const position = new THREE.Vector2(0, 7);

    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        // console.log(count);
        const heightModifier = noise4D(
          position.x * noiseMultiplier,
          position.y * noiseMultiplier,
          count * noiseMultiplier,
          (count + position.x + position.y) * noiseMultiplier
        ) + 1;

        console.log(heightModifier);
        const cube = new THREE.Mesh(
          new THREE.BoxGeometry(
            cubeWidth,
            cubeHeight * heightModifier,
            cubeWidth
          ),
          cubeMaterial
        );
        cube.position.set(
          i * (cubeWidth + alleySize),
          (cubeHeight * heightModifier) / 2,
          j * (cubeWidth + alleySize)
        );
        objects.push(cube);
        count += 1;
      }
    } */

    return objects;
  };

  private createPlane = async () => {
    const textureLoader = new THREE.TextureLoader();

    const wrapTexture = (texture: THREE.Texture) => {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.encoding = THREE.sRGBEncoding;
      texture.repeat.set(10000, 10000);
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
      new THREE.PlaneGeometry(10000, 10000),
      planeMaterial
    );
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = 0;
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
