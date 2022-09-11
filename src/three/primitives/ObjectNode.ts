import { Group } from "three";
import Yoga, { YogaNode } from "@react-pdf/yoga";

export class ObjectNode extends Group {
  public node: YogaNode = Yoga.Node.create();

  constructor(
    width?: number,
    height?: number,
    justifyContent?: Yoga.YogaJustifyContent,
    alignItems?: Yoga.YogaAlign,
    direction?: Yoga.YogaFlexDirection,
    wrap?: Yoga.YogaFlexWrap
  ) {
    super();

    ObjectNode.setObjectNodeProps(
      this,
      width,
      height,
      justifyContent,
      alignItems,
      direction,
      wrap
    );
  }

  public static fromObject = (
    object: Group,
    width?: number,
    height?: number,
    justifyContent?: Yoga.YogaJustifyContent,
    alignItems?: Yoga.YogaAlign,
    direction?: Yoga.YogaFlexDirection,
    wrap?: Yoga.YogaFlexWrap
  ): ObjectNode => {
    const newObject: ObjectNode = Object.create(
      ObjectNode.prototype,
      Object.getOwnPropertyDescriptors<Group>(object)
    );
    Object.assign(newObject, { node: Yoga.Node.create() });

    ObjectNode.setObjectNodeProps(
      newObject,
      width,
      height,
      justifyContent,
      alignItems,
      direction,
      wrap
    );

    return newObject;
  };

  private static setObjectNodeProps(
    objectNode: ObjectNode,
    width?: number,
    height?: number,
    justifyContent?: Yoga.YogaJustifyContent,
    alignItems?: Yoga.YogaAlign,
    direction?: Yoga.YogaFlexDirection,
    wrap?: Yoga.YogaFlexWrap
  ) {
    if (width) objectNode.node.setWidth(width * 1000000);
    if (height) objectNode.node.setHeight(height * 1000000);
    if (justifyContent) objectNode.node.setJustifyContent(justifyContent);
    if (alignItems) objectNode.node.setAlignContent(alignItems);
    if (direction) objectNode.node.setFlexDirection(direction);
    if (wrap) objectNode.node.setFlexWrap(wrap);
  }
}
