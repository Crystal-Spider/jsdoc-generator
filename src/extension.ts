/*
 * The module 'vscode' contains the VS Code extensibility API
 * Import the module and reference it with the alias vscode in your code below
 */
import * as vscode from 'vscode';

/**
 * This method is called when your extension is activated
 * your extension is activated the very first time the command is executed
 *
 * @export
 * @param {vscode.ExtensionContext} context
 */
export function activate(context: vscode.ExtensionContext) {
  /*
   * Use the console to output diagnostic information (console.log) and errors (console.error)
   * This line of code will only be executed once when your extension is activated
   */
  // eslint-disable-next-line no-console
  console.log('Congratulations, your extension "jsdoc-generator" is now active!');

  /*
   * The command has been defined in the package.json file
   * Now provide the implementation of the command with registerCommand
   * The commandId parameter must match the command field in package.json
   */
  const activateCommand = vscode.commands.registerCommand('jsdoc-generator.activate', () => {
    vscode.window.showWarningMessage('Activating JSDoc Generator...');
    vscode.window.showInformationMessage('JSDoc Generator activated successfully');
  });

  /**
   * Generates JSDoc for the element currently selected, if suitable, and if the file is a .js or a .ts file.
   */
  const generateJsdocSelection = vscode.commands.registerCommand('jsdoc-generator.generateJsdocSelection', () => {
    vscode.window.showInformationMessage('Generating JSDoc for the current element');
  });
  /**
   * Generates JSDoc for every suitable element in the file currently opened, if the file is a .js or a .ts file.
   */
  const generateJsdocFile = vscode.commands.registerCommand('jsdoc-generator.generateJsdocFile', () => {
    vscode.window.showInformationMessage('Generating JSDoc for the current file');
  });
  /**
   * Generates JSDoc for every suitable element in every suitable file.
   */
  const generateJsdocFiles = vscode.commands.registerCommand('jsdoc-generator.generateJsdocFiles', () => {
    vscode.window.showInformationMessage('Generating JSDoc for every file');
  });

  context.subscriptions.push(activateCommand, generateJsdocSelection, generateJsdocFile, generateJsdocFiles);
}

/**
 * This method is called when the extension is deactivated
 *
 * @export
 */
export function deactivate() {
  // Empty on purpose
}
