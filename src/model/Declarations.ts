import { Selection } from 'vscode';
import { ClassDeclaration, Declaration, File } from 'typescript-parser';

export class Declarations {
  activeEditorFile: File;
  importsDeclarationMap: Map<string, Declaration> = new Map();
  lastPropertyLineNumber?: number;

  constructor(activeEditorFile: File) {
    this.activeEditorFile = activeEditorFile;
  }

  getClassDeclaration(): ClassDeclaration {
    const declaration = this.activeEditorFile.declarations[0];
    return declaration as ClassDeclaration;
  }
}