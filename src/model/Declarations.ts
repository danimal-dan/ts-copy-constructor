import { Range } from 'vscode';
import { Declaration, File } from 'typescript-parser';

export class Declarations {
  activeEditorFile: File;
  importsDeclarationMap: Map<string, Declaration> = new Map();
  lastPropertyLineNumber?: number;
  constructorLineNumber?: number;
  constructorRange?: Range;
  constructorClosingLineNumber?: number;

  constructor(activeEditorFile: File) {
    this.activeEditorFile = activeEditorFile;
  }
}