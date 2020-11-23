// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { ConstructorInserter } from './ConstructorInserter';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	let inserter = new ConstructorInserter();

    context.subscriptions.push(
        vscode.commands.registerCommand('tsCopyConstructor.insert', () => {
            if (vscode.window.activeTextEditor !== undefined) {
                inserter.insert();
            }
        })
    );

    context.subscriptions.push(inserter);
}

// this method is called when your extension is deactivated
export function deactivate() {
}
