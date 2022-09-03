import { Vector2, Vector3, Matrix4, OrthographicCamera } from "three";
import { fromEvent, mergeMap, Subscription, takeUntil } from "rxjs";

export class TopDownControls {
  private subscriptions: Subscription[] = [];
  private panStart = new Vector2();
  private panEnd = new Vector2();
  private panDelta = new Vector2();
  private panLeftV = new Vector3();
  private panUpV = new Vector3();
  private panOffset = new Vector3();
  private lastPosition = new Vector3();
  private scale = 1;
  private EPS = 0.000001;
  private zoomChanged = false;

  private position0: Vector3;
  private zoom0: number;

  public minZoom = 0;
  public maxZoom = Infinity;
  public zoomSpeed = 1.0;
  public panSpeed = 1.0;

  constructor(
    private camera: OrthographicCamera,
    private domElement: HTMLElement
  ) {
    this.addEvents();
    this.position0 = this.camera.position.clone();
    this.zoom0 = this.camera.zoom;
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
      contextMenu$.subscribe(this.handleContextMenu),
      pointerDown$.subscribe(this.handlePointerDown),
      move$.subscribe(this.handlePointerMove),
      pointerUp$.subscribe(this.handlePointerUp),
      wheel$.subscribe(this.handleMouseWheel)
    );
  };

  private handleContextMenu = (event: Event) => {
    event.preventDefault();
  };

  private handlePointerDown = (event: PointerEvent) => {
    this.panStart.set(event.clientX, event.clientY);
  };

  private handlePointerMove = (event: PointerEvent) => {
    this.panEnd.set(event.clientX, event.clientY);

    this.panDelta
      .subVectors(this.panEnd, this.panStart)
      .multiplyScalar(this.panSpeed);

    this.pan(this.panDelta.x, this.panDelta.y);

    this.panStart.copy(this.panEnd);

    this.update();
  };

  private handlePointerUp = (event: PointerEvent) => {
    this.panStart.set(0, 0);
  };

  private handleMouseWheel = (event: WheelEvent) => {
    if (event.deltaY < 0) {
      this.dollyIn(this.getZoomScale());
    } else if (event.deltaY > 0) {
      this.dollyOut(this.getZoomScale());
    }

    this.update();
  };

  private dollyIn = (dollyScale: number) => {
    this.camera.zoom = Math.max(
      this.minZoom,
      Math.min(this.maxZoom, this.camera.zoom / dollyScale)
    );
    this.camera.updateProjectionMatrix();
    this.zoomChanged = true;
  };

  private dollyOut = (dollyScale: number) => {
    this.camera.zoom = Math.max(
      this.minZoom,
      Math.min(this.maxZoom, this.camera.zoom * dollyScale)
    );
    this.camera.updateProjectionMatrix();
    this.zoomChanged = true;
  };

  private pan = (deltaX: number, deltaY: number) => {
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

  private getZoomScale = () => {
    return Math.pow(0.95, this.zoomSpeed);
  };

  public update = () => {
    const position = this.camera.position;

    position.add(this.panOffset);

    this.scale = 1;
    this.panOffset.set(0, 0, 0);

    if (
      this.zoomChanged ||
      this.lastPosition.distanceToSquared(this.camera.position) > this.EPS
    ) {
      this.lastPosition.copy(this.camera.position);
      this.zoomChanged = false;
      return true;
    }
    return false;
  };

  public reset = () => {
    this.camera.position.copy(this.position0);
    this.camera.zoom = this.zoom0;

    this.camera.updateProjectionMatrix();

    this.update();

    // this.stateMachine.send("RESET");
  };

  public dispose = () => {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  };
}
