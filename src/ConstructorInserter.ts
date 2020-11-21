import { window, workspace, Position, Range, Selection, SnippetString, TextDocument, TextEditor, Uri } from 'vscode';
import { ClassProperty } from './model/ClassProperty';
import { Declarations } from './model/Declarations';
import { PropertyTypeUtil } from './util/PropertyTypeUtil';
import { RegexPatterns } from './model/RegexPatterns';
import { TypescriptParser } from 'typescript-parser';

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
    
    // OLD METHOD: Crawling through each line of the document, using regex to identify import pieces (class declaration, property declaration(s), constructor start and finish, etc.)
    // async getDeclarations(activeDocument: Uri): Promise<Declarations> {
    //     const declarations = new Declarations();
    //     let doc = await workspace.openTextDocument(activeDocument);

    //     for (let line = 0; line < doc.lineCount; line++) {
    //         let textLine = doc.lineAt(line).text.trim();

    //         // is class definition
    //         if (RegexPatterns.CLASS_DEFINITION_START.test(textLine)) {
    //             declarations.className = this.extractClassNameFromText(textLine);

    //             let lineNumber = line;

    //             // If class closing brace isn't inline then increment lineNumber.
    //             if (! textLine.endsWith('{')) {
    //                 lineNumber++;
    //             }

    //             declarations.classLineNumber = lineNumber;
    //         }

    //         // isPropertyDefinition
    //         if (
    //             RegexPatterns.CLASS_PROPERTY.test(textLine) ||
    //             RegexPatterns.STATIC_CLASS_PROPERTY.test(textLine)
    //         ) {
    //             const classPropertyDetails = this.extractClassPropertyDefinitionFromLine(textLine);
    //             declarations.classProperties.push(classPropertyDetails);

    //             declarations.lastPropertyLineNumber = this.findPropertyLastLine(doc, line);
    //         }

    //         // is constructor
    //         if (/constructor/.test(textLine)) {
    //             declarations.constructorLineNumber = line;

    //             declarations.constructorRange = this.findConstructorRange(doc, line);
    //         }

    //         if (declarations.constructorLineNumber !== null && /[ \t].+}/.test(textLine)) {
    //             declarations.constructorClosingLineNumber = line;

    //             // If constructor is found then no need to parse anymore.
    //             break;
    //         }
    //     }

    //     return declarations;
    // }

    extractClassNameFromText(textLine: string): string | undefined {
        const matches = textLine.match(/class ([\w]([\w\d]+)?)/);

        return matches?.[1];
    }

    extractClassPropertyDefinitionFromLine(textLine: string): ClassProperty {
        let parsedLine = textLine.trim();
        const isStatic = /^static.*/.test(parsedLine);
        if (isStatic) {
            parsedLine.replace(/^static/, '').trim();
        }

        const nameMatch = parsedLine.match(/^([\w][\w\d\_]+).*/);
        const name = nameMatch?.[1] ?? '';

        const typeMatch = parsedLine.match(/.*:\s?([\w][\w\d\_]+).*/);
        const namedType = typeMatch?.[1];
        let type;
        if (namedType) {
            type = PropertyTypeUtil.getPropertyTypeFromNamedType(namedType);
        } else {
            const defaultPropertyValue = parsedLine.match(/.*=\s?(.*);$/);
            type = PropertyTypeUtil.inferTypeFromDefaultPropertyValue(defaultPropertyValue?.[1]);
        }

        return new ClassProperty(name, type, isStatic);
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
            if (property.isOptional) {
                snippet += this.getIndentation(indentLevel++);
                snippet += `if (opts?.${property.name} != null) {\n`;
            }
            
            if (PropertyTypeUtil.isPrimitiveType(property.type ?? '')) {
                snippet += this.getIndentation(indentLevel);
                snippet += `this.${property.name} = opts.${property.name};\n`;
            }

            if (property.isOptional) {
                snippet += this.getIndentation(--indentLevel);
                snippet += `}\n`;
            }
        });
        
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

    findPropertyLastLine(doc: TextDocument, line: number) {
        for (line; line < doc.lineCount; line++) {
            let textLine = doc.lineAt(line).text;

            if (textLine.endsWith(';')) {
                return line;
            }
        }
    }

    constructorHasDocBlock(doc: TextDocument, line: number) {
        return doc.lineAt(line).text.endsWith('*/');
    }

    findConstructorRange(doc: TextDocument, line: number): Range | undefined {
        if (! doc.lineAt(line - 1).text.endsWith('*/')) {
            // Constructor doesn't have any docblock.
            return doc.lineAt(line).range;
        }

        for (line; line < doc.lineCount; line--) {
            let textLine = doc.lineAt(line).text;

            if (textLine.endsWith('/**')) {
                return doc.lineAt(line).range;
            }
        }
    }

    async getConstructorDocblock(range?: Range) {
        let doc = await workspace.openTextDocument(this.activeDocument().uri);

        let line = range?.start.line || 0;

        let docblock = '';

        for (line; line < doc.lineCount; line++) {
            let textLine = doc.lineAt(line).text;

            if (/function __construct/.test(textLine)) {
                break;
            }

            docblock += `${textLine}\n`;
        }

        return docblock.replace(/\$/g, '\\$');
    }

    async getConstructorLine(range?: Range) {
        let doc = await workspace.openTextDocument(this.activeDocument().uri);

        let line = range?.start.line ?? 0;

        for (line; line < doc.lineCount; line++) {
            let textLine = doc.lineAt(line).text;

            if (/function __construct/.test(textLine)) {
                return { line, textLine };
            }
        }
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

    getVisibilityChoice(defaultValue: string) {
        let visibilityChoices = ['public', 'protected', 'private'];

        if (visibilityChoices.indexOf(defaultValue) !== -1) {
            visibilityChoices.splice(visibilityChoices.indexOf(defaultValue), 1);
        }

        return [defaultValue, ...visibilityChoices].join(',');
    }

    config<T>(key: string, defaultValue: T): T {
        let config = workspace.getConfiguration('jsCopyConstructor').get<T>(key);

        if (! config) {
            return defaultValue;
        }

        return config;
    }
}
