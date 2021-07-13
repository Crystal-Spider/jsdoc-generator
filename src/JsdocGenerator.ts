import * as path from 'path';
import * as ts from 'typescript';
import {TextDocument, TextEditor, window, SnippetString, Position} from 'vscode';

import {JsdocBuilder} from './JsdocBuilder';
import {LanguageServiceHost} from './LanguageServiceHost';

/**
 * JSDoc Generator
 *
 * @typedef {JsdocGenerator}
 */
export class JsdocGenerator {
	/**
	 * Supported languages.
	 *
	 * @private
	 * @readonly
	 * @type {string[]}
	 */
	private readonly languages: string[] = ['typescript', 'javascript'];

	/**
	 * TS Nodes that can have a JSDoc.
	 *
	 * @private
	 * @readonly
	 * @type {ts.SyntaxKind[]}
	 */
	private readonly supportedNodes: ts.SyntaxKind[] = [
	  ts.SyntaxKind.PropertySignature,
	  ts.SyntaxKind.PropertyDeclaration,
	  ts.SyntaxKind.MethodSignature,
	  ts.SyntaxKind.MethodDeclaration,
	  ts.SyntaxKind.Constructor,
	  ts.SyntaxKind.GetAccessor,
	  ts.SyntaxKind.SetAccessor,
	  ts.SyntaxKind.CallSignature,
	  ts.SyntaxKind.FunctionExpression,
	  ts.SyntaxKind.ArrowFunction,
	  ts.SyntaxKind.VariableDeclaration,
	  ts.SyntaxKind.VariableDeclarationList,
	  ts.SyntaxKind.FunctionDeclaration,
	  ts.SyntaxKind.ClassDeclaration,
	  ts.SyntaxKind.InterfaceDeclaration,
	  ts.SyntaxKind.EnumDeclaration,
	  ts.SyntaxKind.EnumMember
	];

	/**
	 * Handles all interactions between the Language Service and the external world.
	 *
	 * @private
	 * @type {LanguageServiceHost}
	 */
	private languageServiceHost: LanguageServiceHost;

	/**
	 * Language Service.
	 *
	 * @private
	 * @type {ts.LanguageService}
	 */
	private languageServices: ts.LanguageService;

	/**
	 * @constructor
	 */
	constructor() {
	  this.languageServiceHost = new LanguageServiceHost();
	  this.languageServices = ts.createLanguageService(this.languageServiceHost, ts.createDocumentRegistry());
	}

	/**
	 * Placeholder
	 *
	 * @public
	 * @param {TextEditor | undefined} textEditor
	 */
	public generateJsdoc(textEditor: TextEditor) {
	  if(this.isLanguageSupported(textEditor.document)) {
	    const sourceFile = this.retrieveSourceFile(textEditor.document);
	    if(sourceFile) {
	      const caret = textEditor.selection.start;
	      const {line} = caret;
	      const {character} = caret;
	      const position = ts.getPositionOfLineAndCharacter(sourceFile, line, character);
	      const node = this.findNode(sourceFile, position);
	      const supportedNode = this.retrieveSupportedNode(node);
	      if(supportedNode) {
	        const jsdocLocation = this.getJsdocLocation(sourceFile, supportedNode);
	        const jsdoc = this.buildJsdoc(supportedNode);
	        this.insertJsdoc(jsdoc, jsdocLocation, textEditor);
	      } else {
	        window.showErrorMessage('Unable to generate JSDoc at the position (Ln ' + line + ', Col ' + character + ').');
	      }
	    } else {
	      window.showErrorMessage('Unable to generate JSDoc for ' + textEditor.document.fileName);
	    }
	  } else {
	    window.showErrorMessage('Unable to generate JSDoc: ' + textEditor.document.languageId + ' is not supported.');
	  }
	}

	/**
	 * Checks if the language of the document is supported.
	 *
	 * @private
	 * @param {TextDocument} document
	 * @returns {boolean}
	 */
	private isLanguageSupported(document: TextDocument): boolean {
	  return this.languages.some((language) => language === document.languageId);
	}

	/**
	 * Given the document, updates the corresponding file for the languageServiceHost and retrieves
	 * the source file from the languageServices.
	 * Returns the source file is the file exists, undefined otherwise.
	 *
	 * @private
	 * @param {TextDocument} document
	 * @returns {ts.SourceFile | undefined}
	 */
	private retrieveSourceFile(document: TextDocument): ts.SourceFile | undefined {
	  const fileText = document.getText();
	  const fileName = this.getDocumentFileName(document);
	  this.languageServiceHost.updateFile(fileName, fileText);
	  this.languageServices.getSyntacticDiagnostics(fileName);
	  const Program = this.languageServices.getProgram();
	  if(Program) {
	    const sourceFile = Program.getSourceFile(fileName);
	    const newText = document.getText();
	    if(sourceFile) {
	      sourceFile.update(newText, <ts.TextChangeRange>{
	        newLength: newText.length,
	        span: <ts.TextSpan>{
	          start: 0,
	          length: newText.length
	        }
	      });
	      return sourceFile;
	    }
	  }
	  return undefined;
	}

	/**
	 * If it's a TypeScript document, returns the fileName as is with forced '/' as directory separator.
	 * If it's a JavaScript document, returns the fileName with a forced .js extension and '/' as directory separator.
	 * The .js extension for JavaScript documents is forcefully added because TypeScript's file resolution for allowJs
	 * seems to ignore JavaScript documents if they're missing the extension.
	 *
	 * @private
	 * @param {TextDocument} document
	 * @returns {string} document file name
	 */
	private getDocumentFileName(document: TextDocument): string {
	  let fileName = document.fileName.replace(/\\/g, '/');
	  if(!(document.languageId === 'typescript') && path.extname(fileName) !== 'js') {
	    fileName += '.js';
	  }
	  return ts.sys.useCaseSensitiveFileNames ? fileName.toLowerCase() : fileName;
	}

	/**
	 * Finds the deepest node that contains the position.
	 *
	 * @private
	 * @param {ts.Node} source initial node in which to search
	 * @param {number} position
	 * @param {ts.Node} parent needed for recursive calls, defaults to source
	 * @returns {ts.Node}
	 */
	private findNode(source: ts.Node, position: number, parent: ts.Node = source): ts.Node {
	  let node: ts.Node = parent;
	  if(source.getFullStart() <= position && source.getEnd() >= position) {
	    node = source;
	  }
	  source.forEachChild((child) => { node = this.findNode(child, position, node); });
	  return node;
	}

	/**
	 * Retrieves the first (deepest) supported parent node of the node passed as parameter.
	 * If property kind of such parent node equals {@link ts.SyntaxKind.VariableDeclarationList},
	 * also retrieves the VariableDeclaration child node from it.
	 *
	 * @private
	 * @param {ts.Node} node
	 * @returns {ts.Node | null}
	 */
	private retrieveSupportedNode(node: ts.Node): ts.Node | null {
	  let parent = node;
	  while(parent) {
	    if(this.supportedNodes.includes(parent.kind)) {
	      if(parent.kind === ts.SyntaxKind.VariableDeclarationList) {
	        return (<ts.VariableDeclarationList> parent).declarations[0];
	      }
	      return parent;
	    }
	    ({parent} = parent);
	  }
	  return null;
	}

	/**
	 * Returns the {@link ts.LineAndCharacter} where to insert the JSDoc.
	 *
	 * @private
	 * @param {ts.SourceFile} sourceFile
	 * @param {ts.Node} node
	 * @returns {ts.LineAndCharacter}
	 */
	private getJsdocLocation(sourceFile: ts.SourceFile, node: ts.Node): ts.LineAndCharacter {
	  return ts.getLineAndCharacterOfPosition(sourceFile, node.getStart());
	}

	/**
	 * Instantiates a {@link JsdocBuilder} object. Then, depending on the node kind,
	 * calls the appropriate JSDoc building method.
	 *
	 * @private
	 * @param {ts.Node} node
	 * @returns {SnippetString}
	 */
	private buildJsdoc(node: ts.Node): SnippetString {
	  const jsdocBuilder = new JsdocBuilder();

	  switch(node.kind) {
	    case ts.SyntaxKind.ClassDeclaration:
	      return jsdocBuilder.getClassDeclarationJsdoc(<ts.ClassDeclaration>node);
	    /*
	     * Case ts.SyntaxKind.PropertyDeclaration:
	     * case ts.SyntaxKind.PropertySignature:
	     * case ts.SyntaxKind.GetAccessor:
	     * case ts.SyntaxKind.SetAccessor:
	     *   // This._emitPropertyDeclaration(sb, <ts.AccessorDeclaration>node);
	     *   break;
	     * case ts.SyntaxKind.InterfaceDeclaration:
	     *   // This._emitInterfaceDeclaration(sb, <ts.InterfaceDeclaration>node);
	     *   break;
	     * case ts.SyntaxKind.EnumDeclaration:
	     *   // This._emitEnumDeclaration(sb, <ts.EnumDeclaration>node);
	     *   break;
	     * case ts.SyntaxKind.EnumMember:
	     *   // Sb.appendLine();
	     *   break;
	     * case ts.SyntaxKind.CallSignature:
	     * case ts.SyntaxKind.FunctionDeclaration:
	     * case ts.SyntaxKind.MethodDeclaration:
	     * case ts.SyntaxKind.MethodSignature:
	     *   // This._emitMethodDeclaration(sb, <ts.MethodDeclaration>node);
	     *   break;
	     * case ts.SyntaxKind.Constructor:
	     *   // This._emitConstructorDeclaration(sb, <ts.ConstructorDeclaration>node);
	     *   break;
	     * case ts.SyntaxKind.FunctionExpression:
	     * case ts.SyntaxKind.ArrowFunction:
	     *   return '';
	     *   // This._emitFunctionExpression(sb, <ts.FunctionExpression>node, sourceFile);
	     * case ts.SyntaxKind.VariableDeclaration:
	     *   return '';
	     *   // This._emitVariableDeclaration(sb, <ts.VariableDeclaration>node, sourceFile);
	     */
	    default:
	      return jsdocBuilder.emptyJsdoc;
	  }
	}

	/**
	 * Inserts the JSDoc snipper at the given location for the given textEditor.
	 *
	 * @private
	 * @param {SnippetString} jsdoc
	 * @param {ts.LineAndCharacter} location
	 * @param {TextEditor} textEditor
	 * @returns {Thenable<boolean>}
	 */
	private insertJsdoc(jsdoc: SnippetString, location: ts.LineAndCharacter, textEditor: TextEditor): Thenable<boolean> {
	  return textEditor.insertSnippet(jsdoc, new Position(location.line, location.character));
	}
}
