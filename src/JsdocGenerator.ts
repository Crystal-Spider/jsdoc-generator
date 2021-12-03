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
  EnumDeclaration,
  VariableDeclarationList,
  TypeAliasDeclaration,
  VariableStatement
} from 'typescript';
import {TextDocument, TextEditor, window, SnippetString, Position} from 'vscode';

import {JsdocBuilder} from './JsdocBuilder';
import {LanguageServiceHost} from './LanguageServiceHost';
import {TsFile} from './TsFile';
import {UndefTemplate} from './UndefTemplate';

/**
 * JSDoc Generator.
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
	private readonly languages: string[] = ['typescript', 'typescriptreact'];

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
	 * Generate and insert JSDoc for the given textEditor for all the supported nodes.
	 * Displays error messages in case of failure in generating the JSDoc.
	 *
	 * @param {TextEditor} textEditor
	 */
	public generateJsdocFile(textEditor: TextEditor) {
	  if(this.isLanguageSupported(textEditor.document)) {
	    const tsFile = this.retrieveTsFile(textEditor.document);
	    const {sourceFile} = tsFile;
	    if(sourceFile) {
	      const jsdocNumber = this.writeFileJsdoc(tsFile, sourceFile, textEditor);
	      if(jsdocNumber > 0) {
	        window.showInformationMessage(
	          'Correctly generated ' + jsdocNumber + ' JSDoc' + (jsdocNumber > 1 ? 's' : '') + '!'
	        );
	      } else {
	        window.showWarningMessage('No JSDoc was generated.');
	      }
	    } else {
	      window.showErrorMessage('Unable to generate JSDoc for the current file.');
	    }
	  } else {
	    window.showErrorMessage('Unable to generate JSDoc: ' + textEditor.document.languageId + ' is not supported.');
	  }
	}

	/**
	 * Generate and insert JSDoc for the given textEditor at the current location.
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
	      this.writeJsdoc(supportedNode, tsFile, textEditor);
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
	 * @param {UndefTemplate<Position>} [caret=undefined]
	 * @returns {TsFile}
	 */
	private retrieveTsFile(document: TextDocument, caret: UndefTemplate<Position> = undefined): TsFile {
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
	 * @returns {string} document file name.
	 */
	private getDocumentFileName(document: TextDocument): string {
	  const fileName = document.fileName.replace(/\\/g, '/');
	  return sys.useCaseSensitiveFileNames ? fileName.toLowerCase() : fileName;
	}

	/**
	 * Builds the JSDoc and inserts the JSDoc in the location retrieved.
	 *
	 * @private
	 * @param {Node} node node for which generate the JSDoc.
	 * @param {TsFile} tsFile object {@link TsFile} associated with the current file.
	 * @param {TextEditor} textEditor
	 */
	private writeJsdoc(node: Node, tsFile: TsFile, textEditor: TextEditor) {
	  const jsdocLocation = this.getJsdocLocation(<SourceFile>tsFile.sourceFile, node);
	  const jsdoc = this.buildJsdoc(node, tsFile);
	  this.insertJsdoc(jsdoc, jsdocLocation, textEditor);
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
	    case SyntaxKind.FunctionExpression:
	    case SyntaxKind.ArrowFunction:
	    case SyntaxKind.FunctionDeclaration:
	      return jsdocBuilder.getMethodDeclarationJsdoc(<MethodDeclaration>node);
	    case SyntaxKind.ClassDeclaration:
	      return jsdocBuilder.getClassLikeDeclarationJsdoc(<ClassDeclaration>node);
	    case SyntaxKind.InterfaceDeclaration:
	      return jsdocBuilder.getClassLikeDeclarationJsdoc(<InterfaceDeclaration>node);
	    case SyntaxKind.TypeAliasDeclaration:
	      return jsdocBuilder.getTypeAliasJsdoc(<TypeAliasDeclaration>node);
	    case SyntaxKind.EnumDeclaration:
	      return jsdocBuilder.getEnumDeclarationJsdoc(<EnumDeclaration>node);
	    case SyntaxKind.VariableStatement:
	      return jsdocBuilder.getPropertyDeclarationJsdoc(
	        (<VariableDeclarationList>(<VariableStatement>node).declarationList).declarations[0]
	      );
	    case SyntaxKind.VariableDeclarationList:
	      return jsdocBuilder.getPropertyDeclarationJsdoc((<VariableDeclarationList>node).declarations[0]);
	    case SyntaxKind.EnumMember:
	    default:
	      return jsdocBuilder.emptyJsdoc;
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

	/**
	 * For the given sourceFile, iteratively calls {@link JsdocGenerator.writeJsdoc} with a bottom up approach
	 * for every supported node without a JSDoc.
	 *
	 * @private
	 * @param {TsFile} tsFile
	 * @param {SourceFile} sourceFile
	 * @param {TextEditor} textEditor
	 * @returns {number} amount of JSDoc generated.
	 */
	private writeFileJsdoc(tsFile: TsFile, sourceFile: SourceFile, textEditor: TextEditor): number {
	  let jsdocNumber = 0;
	  // Iterated bottom up to avoid shifting of start position of nodes.
	  for(let c = sourceFile.statements.length - 1; c >= 0; c--) {
	    const statement = sourceFile.statements[c];
	    if(tsFile.isNodeSupported(statement)) {
	      if(
	        statement.kind === SyntaxKind.ClassExpression ||
					statement.kind === SyntaxKind.ClassDeclaration ||
					statement.kind === SyntaxKind.InterfaceDeclaration
	      ) {
	        const {members} = <ClassDeclaration>statement;
	        for(let k = members.length - 1; k >= 0; k--) {
	          jsdocNumber += this.writeJsdocConditionally(members[k], tsFile, textEditor);
	        }
	      }
	      jsdocNumber += this.writeJsdocConditionally(statement, tsFile, textEditor);
	    }
	  }
	  return jsdocNumber;
	}

	/**
	 * Checks whether to write the JSDoc for the given node or not. If yes, writes and returns 1.
	 * Doesn't write and returns 0 otherwise.
	 *
	 * @private
	 * @param {Node} node
	 * @param {TsFile} tsFile
	 * @param {TextEditor} textEditor
	 * @returns {number} 1 if the JSDoc has been written, 0 otherwise.
	 */
	private writeJsdocConditionally(node: Node, tsFile: TsFile, textEditor: TextEditor): number {
	  if(!(tsFile.hasJsdoc(node))) {
	    this.writeJsdoc(node, tsFile, textEditor);
	    return 1;
	  }
	  return 0;
	}
}
