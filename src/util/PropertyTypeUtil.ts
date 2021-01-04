import { Declaration } from 'typescript-parser';
import { PropertyType } from '../model/PropertyType';

const primitiveTypes = ['string', 'number', 'boolean'];

export class PropertyTypeUtil {
  static isPrimitive(type: string) {
    return primitiveTypes.includes(type);
  }

  static getPropertyTypeFromNamedType(namedType?: string): PropertyType {
    if (namedType === undefined || primitiveTypes.includes(namedType)) {
      return PropertyType.PRIMITIVE;
    }

    if (/^Array(<[\w\d_]+>)?$/.test(namedType) || namedType.indexOf('[]') > -1) {
      return PropertyType.ARRAY;
    }

    return PropertyType.OBJECT;
  }

  static isDeclarationEnumType(declaration: Declaration) {
    return declaration.hasOwnProperty('members');
  }

  static inferTypeFromDefaultPropertyValue(arg0: string | undefined): any {
    throw new Error('Method not implemented.');
  }

  /**
   * Give a string like Array<SomeType> or SomeType[], this function will return 'SomeType'.
   * @param type 
   */
  static extractItemTypeFromArrayType(type: string | undefined): string | undefined {
    const arrayWithGenericMatches = (type ?? '').match(/^Array<([\w\d_]+)>$/);
    if (arrayWithGenericMatches?.length) {
      return arrayWithGenericMatches[1];
    }

    const arrayWithBracketsMatches = (type ?? '').match(/^([\w\d_]+)\[\]$/);
    if (arrayWithBracketsMatches?.length) {
      return arrayWithBracketsMatches[1];
    }

    return undefined;
  }
}