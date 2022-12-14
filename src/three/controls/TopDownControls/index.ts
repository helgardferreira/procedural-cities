import { Vector2, Vector3, Matrix4, OrthographicCamera, Frustum } from "three";
import {
  distinctUntilChanged,
  fromEvent,
  map,
  mergeMap,
  Subscription,
  takeUntil,
} from "rxjs";
import {
  TopDownControlsService,
  createTopDownControlsMachine,
} from "./machine";
import { ObservableVector3 } from "../../observables/ObservableVector3";
import eventBus from "../../../EventBus";
import { ChangeCameraEvent } from "../../../events/ChangeCameraEvent";

interface TopDownControlsProps {
  camera: OrthographicCamera;
  domElement: HTMLElement;
  frustum: Frustum;
  animate?: boolean;
  debug?: boolean;
}

export class TopDownControls {
  private subscriptions: Subscription[] = [];
  protected panStart = new Vector2();
  protected panEnd = new Vector2();
  protected panDelta = new Vector2();
  private panLeftV = new Vector3();
  private panUpV = new Vector3();
  private panOffset = new Vector3();
  private lastPosition = new Vector3();
  private EPS = 0.000001;
  private zoomChanged = false;
  private stateMachine: TopDownControlsService;

  private position0: Vector3;
  private zoom0: number;

  public minZoom = 0;
  public maxZoom = Infinity;
  public zoomSpeed = 1.0;
  public panSpeed = 1.0;
  public translate: ObservableVector3;

  private camera: OrthographicCamera;
  private domElement: HTMLElement;
  private frustum: Frustum;
  protected debug: boolean;

  constructor(props: TopDownControlsProps) {
    this.camera = props.camera;
    this.domElement = props.domElement;
    this.frustum = props.frustum;
    this.debug = !!props.debug;

    this.domElement.style.touchAction = "none";
    this.addEvents();
    this.position0 = this.camera.position.clone();
    this.zoom0 = this.camera.zoom;

    this.stateMachine = createTopDownControlsMachine.apply(this);
    this.stateMachine.start();

    this.translate = new ObservableVector3(this.camera.position.clone());
    this.translate.$.subscribe((v) => this.camera.position.copy(v));

    const changeCamera$ = this.translate.$.pipe(
      map(
        (vector) =>
          new ChangeCameraEvent({
            x: vector.x,
            y: vector.y,
            z: vector.z,
            cameraFrustum: this.frustum,
          })
      ),
      distinctUntilChanged(
        (prev, curr) =>
          prev.data.x === curr.data.x &&
          prev.data.y === curr.data.y &&
          prev.data.z === curr.data.z
      )
    );
    eventBus.trigger({ changeCamera$ });
  }

  private addEvents = () => {
    const contextMenu$ = fromEvent(this.domElement, "contextmenu");
    const pointerDown$ = fromEvent<PointerEvent>(
      this.domElement,
      "pointerdown"
    );
    const pointerMove$ = fromEvent<PointerEvent>(
      this.domElement,
      "pointermove"
    );
    const pointerUp$ = fromEvent<PointerEvent>(this.domElement, "pointerup");
    const wheel$ = fromEvent<WheelEvent>(this.domElement, "wheel", {
      passive: false,
    });

    const move$ = pointerDown$.pipe(
      mergeMap(() => pointerMove$.pipe(takeUntil(pointerUp$)))
    );

    this.subscriptions.push(
      contextMenu$.subscribe((e) => e.preventDefault()),
      move$.subscribe((event) => {
        this.stateMachine.send({ type: "PAN_MOVE", data: event });
      }),
      pointerUp$.subscribe(() => this.stateMachine.send("PAN_END")),
      wheel$.subscribe((event) =>
        this.stateMachine.send({
          type: "DOLLY_MOVE",
          data: event,
        })
      )
    );
  };

  protected dollyIn = (dollyScale: number) => {
    this.camera.zoom = Math.max(
      this.minZoom,
      Math.min(this.maxZoom, this.camera.zoom / dollyScale)
    );
    this.camera.updateProjectionMatrix();
    this.zoomChanged = true;
  };

  protected dollyOut = (dollyScale: number) => {
    this.camera.zoom = Math.max(
      this.minZoom,
      Math.min(this.maxZoom, this.camera.zoom * dollyScale)
    );
    this.camera.updateProjectionMatrix();
    this.zoomChanged = true;
  };

  protected pan = (deltaX: number, deltaY: number) => {
    this.panLeft(
      (deltaX * (this.camera.right - this.camera.left)) /
        this.camera.zoom /
        this.domElement.clientWidth,
      this.camera.matrix
    );
    this.panUp(
      (deltaY * (this.camera.top - this.camera.bottom)) /
        this.camera.zoom /
        this.domElement.clientHeight,
      this.camera.matrix
    );
  };

  private panLeft = (distance: number, objectMatrix: Matrix4) => {
    this.panLeftV.setFromMatrixColumn(objectMatrix, 0); // get X column of objectMatrix
    this.panLeftV.multiplyScalar(-distance);

    this.panOffset.add(this.panLeftV);
  };

  private panUp = (distance: number, objectMatrix: Matrix4) => {
    this.panUpV.setFromMatrixColumn(objectMatrix, 1); // get Y column of objectMatrix
    this.panUpV.multiplyScalar(distance);

    this.panOffset.add(this.panUpV);
  };

  protected getZoomScale = () => {
    return Math.pow(0.95, this.zoomSpeed);
  };

  public update = () => {
    this.translate.add(this.panOffset);

    this.panOffset.set(0, 0, 0);

    if (
      this.zoomChanged ||
      this.lastPosition.distanceToSquared(this.translate) > this.EPS
    ) {
      this.lastPosition.copy(this.translate);
      this.zoomChanged = false;
      return true;
    }
    return false;
  };

  public reset = () => {
    this.translate.copy(this.position0);
    this.camera.zoom = this.zoom0;

    this.camera.updateProjectionMatrix();

    this.update();

    this.stateMachine.send("RESET");
  };

  public dispose = () => {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  };
}
