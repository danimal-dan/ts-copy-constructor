import { PropertyType } from '../model/PropertyType';

const primitiveTypes = ['string', 'number', 'boolean'];

export class PropertyTypeUtil {
  static isPrimitiveType(type: string) {
    return primitiveTypes.includes(type);
  }

  static getPropertyTypeFromNamedType(namedType: string): PropertyType {
    if (primitiveTypes.includes(namedType)) {
      return PropertyType.PRIMITIVE;
    }

    if (namedType.indexOf('[]') > -1) {
      return PropertyType.ITERABLE;
    }

    return PropertyType.OBJECT;
  }

  static inferTypeFromDefaultPropertyValue(defaultPropertyValue: string | undefined): PropertyType {
    throw new Error('Method not implemented.');
}
}