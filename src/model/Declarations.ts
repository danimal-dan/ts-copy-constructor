import { Range } from 'vscode';
import { ClassProperty } from './ClassProperty';

export class Declarations {
  className?: string;
  classLineNumber?: number;
  classProperties: ClassProperty[] = []; 
  lastPropertyLineNumber?: number;
  constructorLineNumber?: number;
  constructorRange?: Range;
  constructorClosingLineNumber?: number;
}