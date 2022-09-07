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

type VectorMethod = Exclude<keyof Vector3, "x" | "y" | "z" | "isVector3">;

export class DeferredVector3 extends BehaviorSubject<Vector3> implements Vector3 {
  public isVector3: true = true;
  private _proxiedMethods: VectorMethod[] = [
    "set",
    "setScalar",
    "setX",
    "setY",
    "setZ",
    "setComponent",
    "copy",
    "add",
    "addScalar",
    "addScaledVector",
    "addVectors",
    "sub",
    "subScalar",
    "subVectors",
    "multiply",
    "multiplyScalar",
    "multiplyVectors",
    "applyEuler",
    "applyAxisAngle",
    "applyMatrix3",
    "applyNormalMatrix",
    "applyMatrix4",
    "applyQuaternion",
    "project",
    "unproject",
    "transformDirection",
    "divide",
    "divideScalar",
    "min",
    "max",
    "clamp",
    "clampScalar",
    "clampLength",
    "floor",
    "ceil",
    "round",
    "roundToZero",
    "negate",
    "normalize",
    "setLength",
    "lerp",
    "lerpVectors",
    "cross",
    "crossVectors",
    "projectOnVector",
    "projectOnPlane",
    "reflect",
    "setFromSpherical",
    "setFromSphericalCoords",
    "setFromCylindrical",
    "setFromCylindricalCoords",
    "setFromMatrixPosition",
    "setFromMatrixScale",
    "setFromMatrixColumn",
    "setFromMatrix3Column",
    "setFromEuler",
    "fromArray",
    "fromBufferAttribute",
    "random",
    "randomDirection",
  ];

  constructor(private _vector: Vector3 = new Vector3()) {
    super(_vector);

    for (const func of this._proxiedMethods) {
      this[func as VectorMethod] = (...args: any[]): any => {
        const { x, y, z } = this;
        (this._vector[func as VectorMethod] as any)(...args);

        if (
          x !== this._vector.x ||
          y !== this._vector.y ||
          z !== this._vector.z
        ) {
          this.next(this._vector);
        }
        return this;
      };
    }
  }

  clone(): this {
    return new (this.constructor as any)(this._vector.clone());
  }

  getComponent(index: number): number {
    return this._vector.getComponent(index);
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
  lengthManhattan(): number {
    return this._vector.lengthManhattan();
  }
  manhattanLength(): number {
    return this._vector.manhattanLength();
  }
  manhattanDistanceTo(v: Vector3): number {
    return this._vector.manhattanDistanceTo(v);
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
  distanceToManhattan(v: Vector3): number {
    return this._vector.distanceToManhattan(v);
  }
  equals(v: Vector3): boolean {
    return this._vector.equals(v);
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

  public set!: (x: number, y: number, z: number) => this;

  public setScalar!: (scalar: number) => this;

  public setX!: (x: number) => Vector3;

  public setY!: (y: number) => Vector3;

  public setZ!: (z: number) => Vector3;

  public setComponent!: (index: number, value: number) => this;

  public copy!: (v: Vector3) => this;

  public add!: (v: Vector3) => this;

  public addScalar!: (s: number) => this;

  public addScaledVector!: (v: Vector3, s: number) => this;

  public addVectors!: (a: Vector3, b: Vector3) => this;

  public sub!: (a: Vector3) => this;

  public subScalar!: (s: number) => this;

  public subVectors!: (a: Vector3, b: Vector3) => this;

  public multiply!: (v: Vector3) => this;

  public multiplyScalar!: (s: number) => this;

  public multiplyVectors!: (a: Vector3, b: Vector3) => this;

  public applyEuler!: (euler: Euler) => this;

  public applyAxisAngle!: (axis: Vector3, angle: number) => this;

  public applyMatrix3!: (m: Matrix3) => this;

  public applyNormalMatrix!: (m: Matrix3) => this;

  public applyMatrix4!: (m: Matrix4) => this;

  public applyQuaternion!: (q: Quaternion) => this;

  public project!: (camera: Camera) => this;

  public unproject!: (camera: Camera) => this;

  public transformDirection!: (m: Matrix4) => this;

  public divide!: (v: Vector3) => this;

  public divideScalar!: (s: number) => this;

  public min!: (v: Vector3) => this;

  public max!: (v: Vector3) => this;

  public clamp!: (min: Vector3, max: Vector3) => this;

  public clampScalar!: (min: number, max: number) => this;

  public clampLength!: (min: number, max: number) => this;

  public floor!: () => this;

  public ceil!: () => this;

  public round!: () => this;

  public roundToZero!: () => this;

  public negate!: () => this;

  public normalize!: () => this;

  public setLength!: (l: number) => this;

  public lerp!: (v: Vector3, alpha: number) => this;

  public lerpVectors!: (v1: Vector3, v2: Vector3, alpha: number) => this;

  public cross!: (a: Vector3) => this;

  public crossVectors!: (a: Vector3, b: Vector3) => this;

  public projectOnVector!: (v: Vector3) => this;

  public projectOnPlane!: (planeNormal: Vector3) => this;

  public reflect!: (vector: Vector3) => this;

  public setFromSpherical!: (s: Spherical) => this;

  public setFromSphericalCoords!: (
    r: number,
    phi: number,
    theta: number
  ) => this;

  public setFromCylindrical!: (s: Cylindrical) => this;

  public setFromCylindricalCoords!: (
    radius: number,
    theta: number,
    y: number
  ) => this;

  public setFromMatrixPosition!: (m: Matrix4) => this;

  public setFromMatrixScale!: (m: Matrix4) => this;

  public setFromMatrixColumn!: (matrix: Matrix4, index: number) => this;

  public setFromMatrix3Column!: (matrix: Matrix3, index: number) => this;

  public setFromEuler!: (e: Euler) => this;

  public fromArray!: (
    array: number[] | ArrayLike<number>,
    offset?: number | undefined
  ) => this;

  public fromBufferAttribute!: (
    attribute: BufferAttribute | InterleavedBufferAttribute,
    index: number
  ) => this;

  public random!: () => this;

  public randomDirection!: () => this;

  public get x(): number {
    return this._vector.x;
  }
  public get y(): number {
    return this._vector.y;
  }
  public get z(): number {
    return this._vector.z;
  }
}
