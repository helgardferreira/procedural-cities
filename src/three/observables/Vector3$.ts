import { BehaviorSubject } from "rxjs";
import {
  BufferAttribute,
  Camera,
  Cylindrical,
  Euler,
  InterleavedBufferAttribute,
  Matrix3,
  Matrix4,
  Quaternion,
  Spherical,
  Vector3,
  Vector3Tuple,
} from "three";

export class Vector3$ extends BehaviorSubject<Vector3> implements Vector3 {
  public isVector3: true = true;

  constructor(private _vector: Vector3 = new Vector3()) {
    super(_vector);
  }

  public get x(): number {
    return this._vector.x;
  }
  public get y(): number {
    return this._vector.y;
  }
  public get z(): number {
    return this._vector.z;
  }

  clone(): this {
    return new (this.constructor as any)(this._vector.clone());
  }

  set(x: number, y: number, z: number): this {
    this._vector.set(x, y, z);
    this.next(this._vector);
    return this;
  }

  setScalar(scalar: number): this {
    this._vector.setScalar(scalar);
    this.next(this._vector);
    return this;
  }

  setX(x: number): Vector3 {
    this._vector.setX(x);
    this.next(this._vector);
    return this;
  }

  setY(y: number): Vector3 {
    this._vector.setY(y);
    this.next(this._vector);
    return this;
  }

  setZ(z: number): Vector3 {
    this._vector.setZ(z);
    this.next(this._vector);
    return this;
  }

  setComponent(index: number, value: number): this {
    this._vector.setComponent(index, value);
    this.next(this._vector);
    return this;
  }

  getComponent(index: number): number {
    return this._vector.getComponent(index);
  }

  copy(v: Vector3): this {
    this._vector.copy(v);
    this.next(this._vector);
    return this;
  }

  add(v: Vector3): this {
    const { x, y, z } = this;
    this._vector.add(v);

    if (x !== this._vector.x || y !== this._vector.y || z !== this._vector.z) {
      this.next(this._vector);
    }
    return this;
  }

  addScalar(s: number): this {
    this._vector.addScalar(s);
    this.next(this._vector);
    return this;
  }

  addScaledVector(v: Vector3, s: number): this {
    this._vector.addScaledVector(v, s);
    this.next(this._vector);
    return this;
  }

  addVectors(a: Vector3, b: Vector3): this {
    this._vector.addVectors(a, b);
    this.next(this._vector);
    return this;
  }

  sub(a: Vector3): this {
    this._vector.sub(a);
    this.next(this._vector);
    return this;
  }

  subScalar(s: number): this {
    this._vector.subScalar(s);
    this.next(this._vector);
    return this;
  }

  subVectors(a: Vector3, b: Vector3): this {
    this._vector.subVectors(a, b);
    this.next(this._vector);
    return this;
  }

  multiply(v: Vector3): this {
    this._vector.multiply(v);
    this.next(this._vector);
    return this;
  }

  multiplyScalar(s: number): this {
    this._vector.multiplyScalar(s);
    this.next(this._vector);
    return this;
  }

  multiplyVectors(a: Vector3, b: Vector3): this {
    this._vector.multiplyVectors(a, b);
    this.next(this._vector);
    return this;
  }

  applyEuler(euler: Euler): this {
    this._vector.applyEuler(euler);
    this.next(this._vector);
    return this;
  }

  applyAxisAngle(axis: Vector3, angle: number): this {
    this._vector.applyAxisAngle(axis, angle);
    this.next(this._vector);
    return this;
  }

  applyMatrix3(m: Matrix3): this {
    this._vector.applyMatrix3(m);
    this.next(this._vector);
    return this;
  }

  applyNormalMatrix(m: Matrix3): this {
    this._vector.applyNormalMatrix(m);
    this.next(this._vector);
    return this;
  }

  applyMatrix4(m: Matrix4): this {
    this._vector.applyMatrix4(m);
    this.next(this._vector);
    return this;
  }

  applyQuaternion(q: Quaternion): this {
    this._vector.applyQuaternion(q);
    this.next(this._vector);
    return this;
  }

  project(camera: Camera): this {
    this._vector.project(camera);
    this.next(this._vector);
    return this;
  }

  unproject(camera: Camera): this {
    this._vector.unproject(camera);
    this.next(this._vector);
    return this;
  }

  transformDirection(m: Matrix4): this {
    this._vector.transformDirection(m);
    this.next(this._vector);
    return this;
  }

  divide(v: Vector3): this {
    this._vector.divide(v);
    this.next(this._vector);
    return this;
  }

  divideScalar(s: number): this {
    this._vector.divideScalar(s);
    this.next(this._vector);
    return this;
  }

  min(v: Vector3): this {
    this._vector.min(v);
    this.next(this._vector);
    return this;
  }

  max(v: Vector3): this {
    this._vector.max(v);
    this.next(this._vector);
    return this;
  }

  clamp(min: Vector3, max: Vector3): this {
    this._vector.clamp(min, max);
    this.next(this._vector);
    return this;
  }

  clampScalar(min: number, max: number): this {
    this._vector.clampScalar(min, max);
    this.next(this._vector);
    return this;
  }

  clampLength(min: number, max: number): this {
    this._vector.clampLength(min, max);
    this.next(this._vector);
    return this;
  }

  floor(): this {
    this._vector.floor();
    this.next(this._vector);
    return this;
  }

  ceil(): this {
    this._vector.ceil();
    this.next(this._vector);
    return this;
  }

  round(): this {
    this._vector.round();
    this.next(this._vector);
    return this;
  }

  roundToZero(): this {
    this._vector.roundToZero();
    this.next(this._vector);
    return this;
  }

  negate(): this {
    this._vector.negate();
    this.next(this._vector);
    return this;
  }

  dot(v: Vector3): number {
    return this._vector.dot(v);
  }

  lengthSq(): number {
    return this._vector.lengthSq();
  }

  length(): number {
    return this._vector.length();
  }

  /**
   * @deprecated Use {@link Vector3#manhattanLength .manhattanLength()} instead.
   */
  lengthManhattan(): number {
    return this._vector.lengthManhattan();
  }

  manhattanLength(): number {
    return this._vector.manhattanLength();
  }

  manhattanDistanceTo(v: Vector3): number {
    return this._vector.manhattanDistanceTo(v);
  }

  normalize(): this {
    this._vector.normalize();
    this.next(this._vector);
    return this;
  }

  setLength(l: number): this {
    this._vector.setLength(l);
    this.next(this._vector);
    return this;
  }

  lerp(v: Vector3, alpha: number): this {
    this._vector.lerp(v, alpha);
    this.next(this._vector);
    return this;
  }

  lerpVectors(v1: Vector3, v2: Vector3, alpha: number): this {
    this._vector.lerpVectors(v1, v2, alpha);
    this.next(this._vector);
    return this;
  }

  cross(a: Vector3): this {
    this._vector.cross(a);
    this.next(this._vector);
    return this;
  }

  crossVectors(a: Vector3, b: Vector3): this {
    this._vector.crossVectors(a, b);
    this.next(this._vector);
    return this;
  }

  projectOnVector(v: Vector3): this {
    this._vector.projectOnVector(v);
    this.next(this._vector);
    return this;
  }

  projectOnPlane(planeNormal: Vector3): this {
    this._vector.projectOnPlane(planeNormal);
    this.next(this._vector);
    return this;
  }

  reflect(vector: Vector3): this {
    this._vector.reflect(vector);
    this.next(this._vector);
    return this;
  }

  angleTo(v: Vector3): number {
    return this._vector.angleTo(v);
  }

  distanceTo(v: Vector3): number {
    return this._vector.distanceTo(v);
  }

  distanceToSquared(v: Vector3): number {
    return this._vector.distanceToSquared(v);
  }

  /**
   * @deprecated Use {@link Vector3#manhattanDistanceTo .manhattanDistanceTo()} instead.
   */
  distanceToManhattan(v: Vector3): number {
    return this._vector.distanceToManhattan(v);
  }

  setFromSpherical(s: Spherical): this {
    this._vector.setFromSpherical(s);
    this.next(this._vector);
    return this;
  }

  setFromSphericalCoords(r: number, phi: number, theta: number): this {
    this._vector.setFromSphericalCoords(r, phi, theta);
    this.next(this._vector);
    return this;
  }

  setFromCylindrical(s: Cylindrical): this {
    this._vector.setFromCylindrical(s);
    this.next(this._vector);
    return this;
  }

  setFromCylindricalCoords(radius: number, theta: number, y: number): this {
    this._vector.setFromCylindricalCoords(radius, theta, y);
    this.next(this._vector);
    return this;
  }

  setFromMatrixPosition(m: Matrix4): this {
    this._vector.setFromMatrixPosition(m);
    this.next(this._vector);
    return this;
  }

  setFromMatrixScale(m: Matrix4): this {
    this._vector.setFromMatrixScale(m);
    this.next(this._vector);
    return this;
  }

  setFromMatrixColumn(matrix: Matrix4, index: number): this {
    this._vector.setFromMatrixColumn(matrix, index);
    this.next(this._vector);
    return this;
  }

  setFromMatrix3Column(matrix: Matrix3, index: number): this {
    this._vector.setFromMatrix3Column(matrix, index);
    this.next(this._vector);
    return this;
  }

  setFromEuler(e: Euler): this {
    this._vector.setFromEuler(e);
    this.next(this._vector);
    return this;
  }

  equals(v: Vector3): boolean {
    return this._vector.equals(v);
  }

  fromArray(
    array: number[] | ArrayLike<number>,
    offset?: number | undefined
  ): this {
    this._vector.fromArray(array, offset);
    this.next(this._vector);
    return this;
  }

  toArray(array?: number[] | undefined, offset?: number | undefined): number[];
  toArray(
    array?: Vector3Tuple | undefined,
    offset?: 0 | undefined
  ): Vector3Tuple;
  toArray(
    array: ArrayLike<number>,
    offset?: number | undefined
  ): ArrayLike<number>;
  toArray(
    array?: unknown,
    offset?: unknown
  ): number[] | ArrayLike<number> | Vector3Tuple {
    return this._vector.toArray(array as any, offset as any);
  }

  fromBufferAttribute(
    attribute: BufferAttribute | InterleavedBufferAttribute,
    index: number
  ): this {
    this._vector.fromBufferAttribute(attribute, index);
    this.next(this._vector);
    return this;
  }
  random(): this {
    this._vector.random();
    this.next(this._vector);
    return this;
  }
  randomDirection(): this {
    this._vector.randomDirection();
    this.next(this._vector);
    return this;
  }

  *[Symbol.iterator]() {
    yield this.x;
    yield this.y;
    yield this.z;
  }
}
