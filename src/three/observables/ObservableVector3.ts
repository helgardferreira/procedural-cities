import { BehaviorSubject, Observable } from "rxjs";
import { Vector3 } from "three";

type VectorMethod = Exclude<keyof Vector3, "x" | "y" | "z" | "isVector3">;

const _proxiedMethods: VectorMethod[] = [
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

export class ObservableVector3 extends Vector3 {
  private _subject: BehaviorSubject<Vector3>;

  constructor(x?: Vector3);
  constructor(x?: number, y?: number, z?: number);
  constructor(xOrVec?: number | Vector3, y?: number, z?: number) {
    if (xOrVec instanceof Vector3) {
      super(xOrVec.x, xOrVec.y, xOrVec.z);
    } else {
      super(xOrVec, y, z);
    }

    this._subject = new BehaviorSubject<Vector3>(this);

    return new Proxy(this, {
      get: (target, prop) => {
        if (_proxiedMethods.includes(prop as VectorMethod)) {
          return (...args: any[]) => {
            const { x, y, z } = this;
            // @ts-ignore
            const result = target[prop](...args);

            if (x !== this.x || y !== this.y || z !== this.z) {
              this._subject.next(this);
            }

            return result;
          };
        }

        return target[prop as keyof typeof target];
      },
    });
  }

  public get $(): Observable<Vector3> {
    return this._subject.asObservable();
  }
}
