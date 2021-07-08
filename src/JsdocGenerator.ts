import * as path from 'path';
import * as ts from 'typescript';
import {TextDocument, TextEditor} from 'vscode';

import {LanguageServiceHost} from './LanguageServiceHost';

/**
 * JSDoc Generator
 *
 * @typedef {JsdocGenerator}
 */
export class JsdocGenerator {
  /**
   * Supported languages
   *
   * @private
   * @readonly
   * @type {string[]}
   */
	private readonly languages: string[] = ['typescript', 'javascript'];

	/**
	 * Handles all interactions between the Language Service and the external world.
	 *
	 * @private
	 * @type {LanguageServiceHost}
	 */
	private languageServiceHost: LanguageServiceHost;

	/**
	 * Language Service
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
	public generateJsdoc(textEditor: TextEditor | undefined) {
	  if(!!textEditor && this.isLanguageSupported(textEditor.document)) {
	    const sourceFile = this.getSourceFile(textEditor.document);
	    if(sourceFile) {
	      const {selection} = textEditor;
	      const caret = selection.start;
	      const position = ts.getPositionOfLineAndCharacter(sourceFile, caret.line, caret.character);
	      const node = this.findNode(sourceFile, position);
	      console.log(node);
	    }
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
	private getSourceFile(document: TextDocument): ts.SourceFile | undefined {
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
}
