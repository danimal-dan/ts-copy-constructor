import { window, workspace, Position, Range, Selection, SnippetString, TextDocument, TextEditor, Uri } from 'vscode';
import { Declarations } from './model/Declarations';
import { PropertyTypeUtil } from './util/PropertyTypeUtil';
import { RegexPatterns } from './model/RegexPatterns';
import { TypescriptParser } from 'typescript-parser';
import { PropertyType } from './model/PropertyType';

export class ConstructorInserter {
    parser = new TypescriptParser();

    dispose() {
        // don't really know what should go here...
    }

    async insert() {
        let activeDocument = this.activeDocument().uri;

        if (activeDocument === undefined) {
            return;
        }

        let declarations = await this.getDeclarations(activeDocument);

        // validate export exists
        if (declarations.activeEditorFile.declarations.length === 0) {
            return;
        }

        // TODO: Verify cursor is inside class, if so, put the constructor there. Otherwise put it after lastProperty declaration

        // TODO: If constructor exists, ask user if they want to replace it or add a new one
        this.insertConstructor(declarations);
    }

    async getDeclarations(activeDocument: Uri): Promise<Declarations> {
        const activeDocumentPath = Uri.parse(activeDocument.toString().substring(0, activeDocument.toString().lastIndexOf("/")));

        // EXAMPLE OF PARSING DECLARATIONS OF ACTIVE DOCUMENT
        const activeDocumentParseResult = await this.parser.parseSource(this.activeDocument().getText());
        const cursorPosition = await this.activeEditor().selection;

        const declarations = new Declarations(activeDocumentParseResult, cursorPosition);
        
        for (const importDeclaration of activeDocumentParseResult.imports) {
            if (importDeclaration.libraryName && RegexPatterns.RELATIVE_PATH.test(importDeclaration.libraryName)) {
                const importedLibraryPath = Uri.joinPath(activeDocumentPath, importDeclaration.libraryName + '.ts');
                console.info(importedLibraryPath);
                
                const importedFile = await workspace.fs.readFile(importedLibraryPath);
                
                const importParseResult = await this.parser.parseSource(importedFile.toString());
                console.info(importParseResult);

                importParseResult.declarations.forEach(declaration => {
                    if (declaration.name) {
                        declarations.importsDeclarationMap.set(declaration.name, declaration);
                    }
                });
            } else {
                console.info('ignoring import since it is not a relative path', importDeclaration);
            }
        }

        return declarations;
    }

    insertConstructor(declarations: Declarations) {
        let insertLine = this.gotoLine(declarations);

        let snippet = '\n';

        if (! declarations.lastPropertyLineNumber) {
            // If no property and trait uses is found then no need to prepend a line break.
            snippet = '';
        }

        const classDeclaration = declarations.getClassDeclaration();

        snippet = this.getIndentation();

        snippet += `constructor(opts?: Partial<${classDeclaration.name}>) {\n`;

        classDeclaration.properties.forEach(property => {
            let indentLevel = 2;
            snippet += this.getIndentation(indentLevel++);
            snippet += `if (opts?.${property.name} != null) {\n`;

            const propertyType = PropertyTypeUtil.getPropertyTypeFromNamedType(property.type);

            // Need different strategies here for different types
            if (propertyType === PropertyType.PRIMITIVE) {
                snippet += this.getIndentation(indentLevel);
                snippet += `this.${property.name} = opts.${property.name};\n`;
            } else if (propertyType === PropertyType.OBJECT) {
                const objectDeclaration = declarations.importsDeclarationMap.get(property.type ?? '');
                if (objectDeclaration === undefined) {
                    console.info('object not imported, mapping directly to property ', property.name);
                    snippet += this.getIndentation(indentLevel);
                    snippet += `this.${property.name} = opts.${property.name};\n`;
                } else if (PropertyTypeUtil.isDeclarationEnumType(objectDeclaration)) {
                    // TODO: Check to see if enum and if the object is instatiable
                    snippet += this.getIndentation(indentLevel++);
                    snippet += `if (typeof opts?.${property.name} === 'string') {\n`;
                    
                    snippet += this.getIndentation(indentLevel);
                    snippet += `this.${property.name} = ${property.type}[opts.${property.name}];\n`;

                    snippet += this.getIndentation(--indentLevel);
                    snippet += '} else {\n';

                    snippet += this.getIndentation(++indentLevel);
                    snippet += `this.${property.name} = opts.${property.name};\n`;

                    snippet += this.getIndentation(--indentLevel);
                    snippet += '}\n';
                } else {
                    snippet += this.getIndentation(indentLevel);
                    snippet += `this.${property.name} = new ${property.type}(opts.${property.name});\n`;
                }
            } else if (propertyType === PropertyType.ARRAY) {
                const arrayItemType = PropertyTypeUtil.extractItemTypeFromArrayType(property.type);
                const arrayItemTypeDeclaration = declarations.importsDeclarationMap.get(arrayItemType ?? '');
                if (arrayItemTypeDeclaration === undefined) {
                    snippet += this.getIndentation(indentLevel);
                    snippet += `this.${property.name} = [...opts.${property.name}];\n`;    
                } else if (PropertyTypeUtil.isDeclarationEnumType(arrayItemTypeDeclaration)) {
                    snippet += this.getIndentation(indentLevel);
                    snippet += `this.${property.name} = opts.${property.name}.map(val => {\n`;
                    
                    snippet += this.getIndentation(++indentLevel);
                    snippet += `if (typeof val === 'string') {\n`;
                    
                    snippet += this.getIndentation(++indentLevel);
                    snippet += `return ${arrayItemType}[val];\n`;

                    snippet += this.getIndentation(--indentLevel);
                    snippet += '} else {\n';

                    snippet += this.getIndentation(++indentLevel);
                    snippet += `return val;\n`;

                    snippet += this.getIndentation(--indentLevel);
                    snippet += `}\n`;

                    snippet += this.getIndentation(--indentLevel);
                    snippet += '});\n';
                } else {
                    snippet += this.getIndentation(indentLevel);
                    snippet += `this.${property.name} = opts.${property.name}.map(val => new ${arrayItemType}(val));\n`;
                }
            }

            snippet += this.getIndentation(--indentLevel);
            snippet += `}\n`;
        });
        
        snippet += this.getIndentation();
        snippet += '}';

        this.activeEditor().insertSnippet(
            new SnippetString(snippet)
        );
    }

    gotoLine(declarations: Declarations) {
        let insertLineNumber = declarations.cursorPosition.start.line;

        let insertLine = this.activeEditor().document.lineAt(insertLineNumber);
        this.activeEditor().revealRange(insertLine.range);

        let newPosition = new Position(insertLineNumber, 0);
        this.activeEditor().selection = new Selection(newPosition, newPosition);

        return insertLine;
    }

    activeEditor(): TextEditor {
        const activeEditor = window.activeTextEditor;
        if (activeEditor === undefined) {
            throw new Error("Expected TextEditor to be defined");
        }

        return activeEditor;
    }

    activeDocument(): TextDocument {
        return this.activeEditor().document;
    }

    getIndentation(level = 1) {
        let singleLevel;
        let activeResource = window.activeTextEditor?.document.uri;

        if (!workspace.getConfiguration('editor', activeResource).get('insertSpaces')) {
            singleLevel = '\t';
        } else {
            singleLevel = ' '.repeat(workspace.getConfiguration('editor', activeResource).get('tabSize') ?? 0);
        }

        return singleLevel.repeat(level);
    }
}
