import { window, workspace, Position, Range, Selection, SnippetString, TextDocument, TextEditor, Uri } from 'vscode';
import { ClassProperty } from './model/ClassProperty';
import { Declarations } from './model/Declarations';
import { PropertyType } from './model/PropertyType';
import { PropertyTypeUtil } from './util/PropertyTypeUtil';
import { RegexPatterns } from './model/RegexPatterns';

export class PropertyInserter {
    dispose() {
        // don't really know what should go here...
    }

    async insert() {
        let activeDocument = this.activeDocument().uri;

        if (activeDocument === undefined) {
            return;
        }

        let declarations = await this.getDeclarations(activeDocument);

        if (declarations.classLineNumber === null) {
            return;
        }

        // TODO: If constructor exists, ask user if they want to replace it or add a new one
        if (declarations.constructorLineNumber === null) {
            // TODO: Write copy constructor from declartions
            this.insertConstructor(declarations);
        } else {
            this.insertConstructorProperty(declarations);
        }
    }

    async getDeclarations(activeDocument: Uri): Promise<Declarations> {
        const declarations = new Declarations();
        let doc = await workspace.openTextDocument(activeDocument);

        for (let line = 0; line < doc.lineCount; line++) {
            let textLine = doc.lineAt(line).text.trim();

            // is class definition
            if (RegexPatterns.CLASS_DEFINITION_START.test(textLine)) {
                declarations.className = this.extractClassNameFromText(textLine);

                let lineNumber = line;

                // If class closing brace isn't inline then increment lineNumber.
                if (! textLine.endsWith('{')) {
                    lineNumber++;
                }

                declarations.classLineNumber = lineNumber;
            }

            // isPropertyDefinition
            if (
                RegexPatterns.CLASS_PROPERTY.test(textLine) ||
                RegexPatterns.STATIC_CLASS_PROPERTY.test(textLine)
            ) {
                const classPropertyDetails = this.extractClassPropertyDefinitionFromLine(textLine);
                declarations.classProperties.push(classPropertyDetails);

                declarations.lastPropertyLineNumber = this.findPropertyLastLine(doc, line);
            }

            // is constructor
            if (/constructor/.test(textLine)) {
                declarations.constructorLineNumber = line;

                declarations.constructorRange = this.findConstructorRange(doc, line);
            }

            if (declarations.constructorLineNumber !== null && /[ \t].+}/.test(textLine)) {
                declarations.constructorClosingLineNumber = line;

                // If constructor is found then no need to parse anymore.
                break;
            }
        }

        return declarations;
    }

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

        snippet = this.getIndentation();

        if (this.config('choosePropertyVisibility', false)) {
            snippet += '${2|' + this.getVisibilityChoice(this.config('visibility', 'protected'))+'|}';
        } else {
            snippet += this.config('visibility', 'protected');
        }

        snippet += ' \\$${1:property};\n\n' + this.getIndentation();

        if (this.config('chooseConstructorVisibility', false)) {
            snippet += '${3|' + this.getVisibilityChoice(this.config('constructorVisibility', 'public'))+'|}';
        } else {
            snippet += this.config('constructorVisibility', 'public');
        }

        snippet += ' function __construct(\\$${1:property})\n' +
            this.getIndentation() + '{\n' +
            this.getIndentation(2) + '\\$this->${1:property} = \\$${1:property};$0\n' +
            this.getIndentation() + '}';

        let nextLineOfInsertLine = this.activeEditor().document.lineAt(insertLine.lineNumber + 1);

        // If insert line is class closing brace or insert line is empty and
        // next line is not class closing brace then add one new line.
        if (
            insertLine.text.endsWith('}') ||
            (insertLine.text === '' && ! nextLineOfInsertLine.text.endsWith('}'))
        ) {
            snippet += '\n';
        }

        if (insertLine.text !== '' && ! insertLine.text.endsWith('}')) {
            //Insert line is not empty and next line is not class closing brace so add two new line.
            snippet += '\n\n';
        }

        this.activeEditor().insertSnippet(
            new SnippetString(snippet)
        );
    }

    async insertConstructorProperty(declarations: Declarations) {
        this.gotoLine(declarations);

        let snippet = this.getIndentation();

        if (this.config('choosePropertyVisibility', false)) {
            snippet += '${2|'+this.getVisibilityChoice(this.config('visibility', 'protected'))+'|}';
        } else {
            snippet += this.config('visibility', 'protected');
        }

        snippet += ' \\$${1:property};\n\n';

        let constructorStartLineNumber = declarations.constructorRange?.start.line ?? 0;
        let constructorLineText = this.activeEditor().document.getText(declarations.constructorRange);

        if (constructorLineText.endsWith('/**')) {
            snippet += await this.getConstructorDocblock(declarations.constructorRange);

            let constructor = await this.getConstructorLine(declarations.constructorRange);

            constructorStartLineNumber = constructor?.line ?? 0;
            constructorLineText = constructor?.textLine ?? '';
        }

        // Split constructor arguments.
        let constructor = constructorLineText.split(/\((.*?)\)/);

        snippet += `${constructor[0]}(`;

        // Escape all "$" signs of constructor arguments otherwise
        // vscode will assume "$" sign is a snippet placeholder.
        let previousArgs = constructor[1].replace(/\$/g, '\\$');

        if (previousArgs.length !== 0)  {
            // Add previous constructor arguments.
            snippet += `${previousArgs}\, `;
        }

        snippet += '\\$\${1:property})';

        let constructorClosingLine = this.activeEditor().document.lineAt(constructorStartLineNumber);

        // Add all previous property assignments to the snippet.
        for (let line = constructorStartLineNumber; line < (declarations.constructorClosingLineNumber ?? 0); line++) {
            let propertyAssignment = this.activeEditor().document.lineAt(line + 1);

            constructorClosingLine = propertyAssignment;

            // Escape all "$" signs of property assignments.
            snippet += '\n' + propertyAssignment.text.replace(/\$/g, '\\$');
        }

        // Slice constructor closing brace.
        snippet = snippet.slice(0, -1);

        snippet += this.getIndentation() + '\\$this->${1:property} = \\$${1:property};$0';
        snippet += '\n' + this.getIndentation() +'}';

        let nextLineOfConstructorClosing = this.activeEditor().document.lineAt(constructorClosingLine.lineNumber + 1).text;

        // If there is no new line after constructor closing brace then append
        // new line except if the next line is not class closing brace.
        if (nextLineOfConstructorClosing !== '' && ! nextLineOfConstructorClosing.endsWith('}')) {
            snippet += '\n';
        }

        let start = new Position(
            declarations.constructorRange?.start.line ?? 0,
            declarations.constructorRange?.start.character ?? 0
        );

        let end = new Position(
            constructorClosingLine?.range.end.line ?? 0,
            constructorClosingLine?.range.end.character ?? 0 
        );

        this.activeEditor().insertSnippet(
            new SnippetString(snippet),
            new Range(start, end)
        );
    }

    gotoLine(declarations: Declarations) {
        let insertLineNumber = this.getInsertLine(declarations);

        let insertLine = this.activeEditor().document.lineAt(insertLineNumber);
        this.activeEditor().revealRange(insertLine.range);

        let newPosition = new Position(insertLineNumber, 0);
        this.activeEditor().selection = new Selection(newPosition, newPosition);

        return insertLine;
    }

    getInsertLine(declarations: Declarations): number {
        let lineNumber = (declarations.lastPropertyLineNumber || declarations.classLineNumber) ?? 0;

        return ++lineNumber;
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
