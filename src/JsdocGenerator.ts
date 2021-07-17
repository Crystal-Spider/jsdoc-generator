import {extname} from 'path';
import {
  LanguageService,
  createLanguageService,
  createDocumentRegistry,
  SourceFile,
  sys,
  Node,
  LineAndCharacter,
  getLineAndCharacterOfPosition,
  SyntaxKind,
  PropertyDeclaration,
  ConstructorDeclaration,
  AccessorDeclaration,
  MethodDeclaration,
  ClassDeclaration,
  InterfaceDeclaration,
  EnumDeclaration
} from 'typescript';
import {TextDocument, TextEditor, window, SnippetString, Position} from 'vscode';

import {JsdocBuilder} from './JsdocBuilder';
import {LanguageServiceHost} from './LanguageServiceHost';
import {TsFile} from './TsFile';

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
	private readonly languages: string[] = ['typescript'];

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
	 * @type {LanguageService}
	 */
	private languageServices: LanguageService;

	/**
	 * @constructor
	 */
	constructor() {
	  this.languageServiceHost = new LanguageServiceHost();
	  this.languageServices = createLanguageService(this.languageServiceHost, createDocumentRegistry());
	}

	/**
	 * Generate and insert JSDoc for the given textEditor.
	 * Displays error messages in case of failure in generating the JSDoc.
	 *
	 * @public
	 * @param {TextEditor} textEditor
	 */
	public generateJsdoc(textEditor: TextEditor) {
	  if(this.isLanguageSupported(textEditor.document)) {
	    const caret = textEditor.selection.start;
	    const tsFile = this.retrieveTsFile(textEditor.document, caret);
	    const {supportedNode} = tsFile;
	    if(supportedNode) {
	      const jsdocLocation = this.getJsdocLocation(<SourceFile>tsFile.sourceFile, supportedNode);
	      const jsdoc = this.buildJsdoc(supportedNode, tsFile);
	      this.insertJsdoc(jsdoc, jsdocLocation, textEditor);
	    } else {
	      window.showErrorMessage(
	        'Unable to generate JSDoc at position (Ln ' + caret.line + ', Col ' + caret.character + ').'
	      );
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
	 * @param {Position} caret
	 * @returns {TsFile}
	 */
	private retrieveTsFile(document: TextDocument, caret: Position): TsFile {
	  const fileText = document.getText();
	  const fileName = this.getDocumentFileName(document);
	  this.languageServiceHost.updateFile(fileName, fileText);
	  this.languageServices.getSyntacticDiagnostics(fileName);
	  const program = this.languageServices.getProgram();
	  return new TsFile(program, fileName, document.getText(), caret);
	}

	/**
	 * If it's a TypeScript document, returns the fileName with forced '/' as directory separator
	 * and, if missing, a forced .ts extension.
	 *
	 * @private
	 * @param {TextDocument} document
	 * @returns {string} document file name
	 */
	private getDocumentFileName(document: TextDocument): string {
	  let fileName = document.fileName.replace(/\\/g, '/');
	  if(document.languageId === 'typescript' && extname(fileName) !== 'ts') {
	    fileName += '.ts';
	  }
	  return sys.useCaseSensitiveFileNames ? fileName.toLowerCase() : fileName;
	}

	/**
	 * Returns the {@link LineAndCharacter} where to insert the JSDoc.
	 *
	 * @private
	 * @param {SourceFile} sourceFile
	 * @param {Node} node
	 * @returns {LineAndCharacter}
	 */
	private getJsdocLocation(sourceFile: SourceFile, node: Node): LineAndCharacter {
	  return getLineAndCharacterOfPosition(sourceFile, node.getStart());
	}

	/**
	 * Instantiates a {@link JsdocBuilder} object. Then, depending on the node kind,
	 * calls the appropriate JSDoc building method.
	 *
	 * @private
	 * @param {Node} node
	 * @param {TsFile} tsFile
	 * @returns {SnippetString} JSDoc built.
	 */
	private buildJsdoc(node: Node, tsFile: TsFile): SnippetString {
	  const jsdocBuilder = new JsdocBuilder(tsFile);

	  switch(node.kind) {
	    case SyntaxKind.PropertySignature:
	    case SyntaxKind.PropertyDeclaration:
	      return jsdocBuilder.getPropertyDeclarationJsdoc(<PropertyDeclaration>node);
	    case SyntaxKind.Constructor:
	      return jsdocBuilder.getConstructorJsdoc(<ConstructorDeclaration>node);
	    case SyntaxKind.GetAccessor:
	    case SyntaxKind.SetAccessor:
	      return jsdocBuilder.getAccessorDeclarationJsdoc(<AccessorDeclaration>node);
	    case SyntaxKind.MethodSignature:
	    case SyntaxKind.MethodDeclaration:
	    case SyntaxKind.CallSignature:
	    case SyntaxKind.FunctionDeclaration:
	      return jsdocBuilder.getMethodDeclarationJsdoc(<MethodDeclaration>node);
	    case SyntaxKind.ClassDeclaration:
	      return jsdocBuilder.getClassLikeDeclarationJsdoc(<ClassDeclaration>node);
	    case SyntaxKind.InterfaceDeclaration:
	      return jsdocBuilder.getClassLikeDeclarationJsdoc(<InterfaceDeclaration>node);
	    case SyntaxKind.TypeAliasDeclaration:
	      return jsdocBuilder.emptyJsdoc;
	    case SyntaxKind.EnumDeclaration:
	      return jsdocBuilder.getEnumDeclarationJsdoc(<EnumDeclaration>node);
	    case SyntaxKind.EnumMember:
	    default:
	      return jsdocBuilder.emptyJsdoc;
			// TODO: add support for variables.
	  }
	}

	/**
	 * Inserts the JSDoc snipper at the given location for the given textEditor.
	 *
	 * @private
	 * @param {SnippetString} jsdoc
	 * @param {LineAndCharacter} location
	 * @param {TextEditor} textEditor
	 * @returns {Thenable<boolean>}
	 */
	private insertJsdoc(jsdoc: SnippetString, location: LineAndCharacter, textEditor: TextEditor): Thenable<boolean> {
	  return textEditor.insertSnippet(jsdoc, new Position(location.line, location.character));
	}
}
