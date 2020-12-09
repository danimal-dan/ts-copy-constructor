import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
// import * as myExtension from '../../extension';

const testFileContent = 
`export class TestClass {
  name?: string;


}
`;

suite('Extension Test Suite', function () {
	this.timeout(5000);

	let textContent = '';
	suiteSetup(async () => {
		vscode.window.showInformationMessage('Start all tests.');

		try {
			const openedTextDocument = await vscode.workspace.openTextDocument({
				language: 'typescript',
				content: testFileContent,
			});
			console.info('opened document', openedTextDocument);
			
			const editorWindow = await vscode.window.showTextDocument(openedTextDocument);
			editorWindow.options.insertSpaces = true;
			editorWindow.options.tabSize = 2;
			
			editorWindow.selection = new vscode.Selection(3, 3, 3, 3);

			await vscode.commands.executeCommand('tsCopyConstructor.insert');

			textContent = openedTextDocument.getText();		
			console.info(textContent);
		} catch (e) {
			console.info('some error happened', e);
		}
	});

	test('Sample test', () => {
		assert.notStrictEqual(textContent, testFileContent, 'Did the command run? File content was unchanged.');

		const expectedTextContent = 
		`export class TestClass {
  name?: string;

  constructor(opts?: Partial<TestClass>) {
    if (opts?.name != null) {
      this.name = opts.name;
    }
  }
}
`;
		assert.strictEqual(textContent, expectedTextContent);
	});
});
