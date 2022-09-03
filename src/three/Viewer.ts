import { fromEvent, Subscription } from "rxjs";
import * as THREE from "three";
import { TopDownControls } from "./controls/TopDownControls";
import { DEG2RAD } from "three/src/math/MathUtils";

export class Viewer {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private subscriptions: Subscription[] = [];
  private clock = new THREE.Clock();
  private topDownControls: TopDownControls;
  // private camera: THREE.PerspectiveCamera;
  private ortho: THREE.OrthographicCamera;
  private orthoSize = 20;

  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
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
    this.ortho.position.set(0, 4, 8);
    this.ortho.lookAt(0, 0, 0);

    // Create and attach controls
    this.topDownControls = new TopDownControls(this.ortho, this.canvas);

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.init();

    this.render();
  }

  get canvas() {
    return this.renderer.domElement;
  }

  private createObjects = () => {
    const objects = [];

    const textureMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    textureMaterial.side = THREE.FrontSide;

    const defaultMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    defaultMaterial.side = THREE.BackSide;

    const planeSize = 4;

    const planeGeometry = new THREE.PlaneGeometry(planeSize, planeSize, 1, 1);

    const leftWall = new THREE.Group();
    const rightWall = new THREE.Group();
    const floor = new THREE.Group();

    leftWall.add(
      new THREE.Mesh(planeGeometry, textureMaterial),
      new THREE.Mesh(planeGeometry, defaultMaterial)
    );
    rightWall.add(
      new THREE.Mesh(planeGeometry, textureMaterial.clone()),
      new THREE.Mesh(planeGeometry, defaultMaterial)
    );
    floor.add(
      new THREE.Mesh(planeGeometry, textureMaterial.clone()),
      new THREE.Mesh(planeGeometry, defaultMaterial)
    );

    leftWall.rotateY(45 * DEG2RAD);
    rightWall.rotateY(-45 * DEG2RAD);
    floor.rotateX(-90 * DEG2RAD);
    floor.rotateZ(45 * DEG2RAD);

    const distance = (Math.cos(Math.PI / 4) * planeSize) / 2;

    leftWall.position.set(-distance, 0, 0);
    rightWall.position.set(distance, 0, 0);
    floor.position.set(0, -planeSize / 2, distance);
    const walls = new THREE.Group();

    walls.add(leftWall, rightWall);

    objects.push(walls, floor);
    return objects;
  };

  private createLights = () => {
    const lights = [];

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    const pointLight = new THREE.PointLight(0xffffff, 0.7);
    pointLight.position.add(new THREE.Vector3(0, 3, 3));

    lights.push(ambientLight, pointLight);
    return lights;
  };

  private init = () => {
    const objects = this.createObjects();
    const lights = this.createLights();

    this.scene.add(...objects, ...lights);

    this.addEventListeners();
  };

  private addEventListeners = () => {
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
  };
}

const viewer = new Viewer();

export default viewer;
