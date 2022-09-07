import { BehaviorSubject } from "rxjs";
import { Vector3 } from "three";

type VectorMethod = Exclude<keyof Vector3, "x" | "y" | "z" | "isVector3">;

export class ProxiedVector3Prop extends BehaviorSubject<Vector3> {
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

  constructor(public vector: Vector3 = new Vector3()) {
    super(vector);

    this.vector = new Proxy(vector, {
      get: (target, prop) => {
        if (this._proxiedMethods.includes(prop as VectorMethod)) {
          return (...args: any[]) => {
            const { x, y, z } = this.vector;
            // @ts-ignore
            const result = target[prop](...args);

            if (
              x !== this.vector.x ||
              y !== this.vector.y ||
              z !== this.vector.z
            ) {
              this.next(this.vector);
            }

            return result;
          };
        }

        return target[prop as keyof typeof target];
      },
    });
  }
}
