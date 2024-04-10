// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { YeetSheet } from './YeetSheet';

let yeetSheet: YeetSheet | undefined = undefined;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('yeetsheet.yeet', () => {
		if (!yeetSheet) {
			vscode.workspace.openTextDocument( {
				language: 'text'
			} )
			.then( doc => {
				yeetSheet = new YeetSheet(doc);
				yeetSheet?.yeet();
				vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside, true);
			
				yeetSheet.updateDocumentContent();
			});
		} else {
			yeetSheet.yeet();
			
			yeetSheet.updateDocumentContent();
		}
	});

	context.subscriptions.push(disposable);

	
	//context.subscriptions.push(YeetSheetEditorProvider.register(context));7
}

// This method is called when your extension is deactivated
export function deactivate() {}
