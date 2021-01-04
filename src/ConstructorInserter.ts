import { window, workspace, SnippetString, TextDocument, TextEditor, Uri } from 'vscode';
import { Declarations } from './model/Declarations';
import { RegexPatterns } from './model/RegexPatterns';
import { TypescriptParser } from 'typescript-parser';
import { IndentationSpec } from './model/IndentationSpec';
import { ConstructorSnippetGenerator } from './generator/ConstructorSnippetGenerator';

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

        const declarations = new Declarations(activeDocumentParseResult);
        
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
        const indentationSpec = this.getIndentationSpec();

        const snippetGenerator = new ConstructorSnippetGenerator(declarations, indentationSpec);

        const snippet = snippetGenerator.generateSnippet();

        this.activeEditor().insertSnippet(
            new SnippetString(snippet)
        );
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

    /**
     * Reads the IDE configuration to identify what type of indentation should be used.
     */
    getIndentationSpec(): IndentationSpec {
        let activeResource = window.activeTextEditor?.document.uri;
        if (!workspace.getConfiguration('editor', activeResource).get('insertSpaces')) {
            return new IndentationSpec(false);
        }
        
        return new IndentationSpec(true, workspace.getConfiguration('editor', activeResource).get('tabSize') ?? 0);
    }
}
