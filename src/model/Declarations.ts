import { Range, Selection } from 'vscode';
import { ClassDeclaration, Declaration, File } from 'typescript-parser';

export class Declarations {
  activeEditorFile: File;
  importsDeclarationMap: Map<string, Declaration> = new Map();
  lastPropertyLineNumber?: number;
  constructorLineNumber?: number;
  constructorRange?: Range;
  constructorClosingLineNumber?: number;
  cursorPosition: Selection; 

  constructor(activeEditorFile: File, cursorPosition: Selection) {
    this.activeEditorFile = activeEditorFile;
    this.cursorPosition = cursorPosition;
  }

  getClassDeclaration(): ClassDeclaration {
    const declaration = this.activeEditorFile.declarations[0];
    return declaration as ClassDeclaration;
  }
}