import { PropertyType } from "./PropertyType";

export class ClassProperty {
  name: string;
  type: PropertyType;
  isStatic: boolean;

  constructor(name: string, type: PropertyType, isStatic = false) {
    this.name = name;
    this.type = type;
    
    this.isStatic = isStatic;
  }
}