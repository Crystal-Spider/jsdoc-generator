import {LanguageService, createLanguageService, createDocumentRegistry, SourceFile, sys, Node, LineAndCharacter, getLineAndCharacterOfPosition, SyntaxKind, PropertyDeclaration, ConstructorDeclaration, AccessorDeclaration, MethodDeclaration, ClassDeclaration, InterfaceDeclaration, EnumDeclaration, VariableDeclarationList, TypeAliasDeclaration, VariableStatement} from 'typescript';
import {TextDocument, TextEditor, window, SnippetString, Position} from 'vscode';

import {JsdocBuilder} from './JsdocBuilder';
import {LanguageServiceHost} from './LanguageServiceHost';
import {TsFile} from './TsFile';

/**
 * JSDoc Generator.
 *
 * @export
 * @class JsdocGenerator
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
  private readonly languages: string[] = [
    'javascript',
    'javascriptreact',
    'typescript',
    'typescriptreact'
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
    if (this.isLanguageSupported(textEditor.document)) {
      const tsFile = this.retrieveTsFile(textEditor.document);
      const {sourceFile} = tsFile;
      if (sourceFile) {
        this.writeFileJsdoc(tsFile, sourceFile, textEditor).then(jsdocNumber => {
          if (jsdocNumber > 0) {
            window.showInformationMessage(`Correctly generated ${jsdocNumber} JSDoc${(jsdocNumber > 1 ? 's' : '')}!`);
          } else {
            window.showWarningMessage('No JSDoc was generated.');
          }
        });
      } else {
        window.showErrorMessage('Unable to generate JSDoc for the current file.');
      }
    } else {
      window.showErrorMessage(`Unable to generate JSDoc: ${textEditor.document.languageId} is not supported.`);
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
    if (this.isLanguageSupported(textEditor.document)) {
      const caret = textEditor.selection.start;
      const tsFile = this.retrieveTsFile(textEditor.document, caret);
      const {supportedNode} = tsFile;
      if (supportedNode) {
        this.writeJsdoc(supportedNode, tsFile, textEditor).then(
          undefined,
          reason => window.showErrorMessage(`Unable to generate JSDoc at position (Ln ${caret.line}, Col ${caret.character}) because of ${reason}.`)
        );
      } else {
        window.showErrorMessage(`Unable to generate JSDoc at position (Ln ${caret.line}, Col ${caret.character}).`);
      }
    } else {
      window.showErrorMessage(`Unable to generate JSDoc: ${textEditor.document.languageId} is not supported.`);
    }
  }

  /**
   * Checks if the language of the document is supported.
   *
   * @private
   * @param {TextDocument} document
   * @returns {boolean} whether the document language is supported.
   */
  private isLanguageSupported(document: TextDocument): boolean {
    return this.languages.some(language => language === document.languageId);
  }

  /**
   * Given the document, updates the corresponding file for the languageServiceHost and retrieves
   * the source file from the languageServices.
   * Returns the source file is the file exists, undefined otherwise.
   *
   * @private
   * @param {TextDocument} document
   * @param {?Position} [caret]
   * @returns {TsFile}
   */
  private retrieveTsFile(document: TextDocument, caret?: Position): TsFile {
    const fileText = document.getText();
    const fileName = this.getDocumentFileName(document);
    this.languageServiceHost.updateFile(fileName, fileText);
    this.languageServices.getSyntacticDiagnostics(fileName);
    const program = this.languageServices.getProgram();
    return new TsFile(fileName, document.getText(), caret, program);
  }

  /**
   * If it's a TypeScript document, returns the fileName with forced '/' as directory separator.
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
   * @returns {Thenable<boolean>} promise that resolves with a value indicating if the snippet could be inserted.
   */
  private writeJsdoc(node: Node, tsFile: TsFile, textEditor: TextEditor): Thenable<boolean> {
    const jsdocLocation = this.getJsdocLocation(tsFile.sourceFile as SourceFile, node);
    const jsdoc = this.buildJsdoc(node, tsFile);
    return this.insertJsdoc(jsdoc, jsdocLocation, textEditor);
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

    switch (node.kind) {
      case SyntaxKind.PropertySignature:
      case SyntaxKind.PropertyDeclaration:
        return jsdocBuilder.getPropertyDeclarationJsdoc(node as PropertyDeclaration);
      case SyntaxKind.Constructor:
        return jsdocBuilder.getConstructorJsdoc(node as ConstructorDeclaration);
      case SyntaxKind.GetAccessor:
      case SyntaxKind.SetAccessor:
        return jsdocBuilder.getAccessorDeclarationJsdoc(node as AccessorDeclaration);
      case SyntaxKind.MethodSignature:
      case SyntaxKind.MethodDeclaration:
      case SyntaxKind.CallSignature:
      case SyntaxKind.FunctionExpression:
      case SyntaxKind.ArrowFunction:
      case SyntaxKind.FunctionDeclaration:
        return jsdocBuilder.getMethodDeclarationJsdoc(node as MethodDeclaration);
      case SyntaxKind.ClassDeclaration:
        return jsdocBuilder.getClassLikeDeclarationJsdoc(node as ClassDeclaration);
      case SyntaxKind.InterfaceDeclaration:
        return jsdocBuilder.getClassLikeDeclarationJsdoc(node as InterfaceDeclaration);
      case SyntaxKind.TypeAliasDeclaration:
        return jsdocBuilder.getTypeAliasJsdoc(node as TypeAliasDeclaration);
      case SyntaxKind.EnumDeclaration:
        return jsdocBuilder.getEnumDeclarationJsdoc(node as EnumDeclaration);
      case SyntaxKind.VariableStatement:
        return jsdocBuilder.getPropertyDeclarationJsdoc(((node as VariableStatement).declarationList as VariableDeclarationList).declarations[0]);
      case SyntaxKind.VariableDeclarationList:
        return jsdocBuilder.getPropertyDeclarationJsdoc((node as VariableDeclarationList).declarations[0]);
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
   * @returns {Thenable<boolean>} promise that resolves with a value indicating if the snippet could be inserted.
   */
  private insertJsdoc(jsdoc: SnippetString, location: LineAndCharacter, textEditor: TextEditor): Thenable<boolean> {
    return textEditor.insertSnippet(jsdoc, new Position(location.line, location.character));
  }

  /**
   * For the given sourceFile, iteratively calls {@link JsdocGenerator.writeJsdoc} with a bottom up approach for every supported node without a JSDoc.
   *
   * @private
   * @async
   * @param {TsFile} tsFile
   * @param {SourceFile} sourceFile
   * @param {TextEditor} textEditor
   * @returns {Promise<number>} {@link Promise} with the number of JSDocs generated.
   */
  private async writeFileJsdoc(tsFile: TsFile, sourceFile: SourceFile, textEditor: TextEditor): Promise<number> {
    let jsdocNumber = 0;
    // Iterated bottom up to avoid shifting of start position of nodes.
    for (let c = sourceFile.statements.length - 1; c >= 0; c--) {
      const statement = sourceFile.statements[c];
      if (tsFile.isNodeSupported(statement)) {
        // eslint-disable-next-line max-len
        if (statement.kind === SyntaxKind.ClassExpression || statement.kind === SyntaxKind.ClassDeclaration || statement.kind === SyntaxKind.InterfaceDeclaration) {
          const {members} = statement as ClassDeclaration;
          for (let k = members.length - 1; k >= 0; k--) {
            jsdocNumber += +(await this.writeJsdocConditionally(members[k], tsFile, textEditor));
          }
        }
        jsdocNumber += +(await this.writeJsdocConditionally(statement, tsFile, textEditor));
      }
    }
    return jsdocNumber;
  }

  /**
   * Checks whether to write the JSDoc for the given node or not.
   *
   * @private
   * @async
   * @param {Node} node
   * @param {TsFile} tsFile
   * @param {TextEditor} textEditor
   * @returns {Promise<boolean>} {@link Promise} with whether the JSDoc has been written.
   */
  private async writeJsdocConditionally(node: Node, tsFile: TsFile, textEditor: TextEditor): Promise<boolean> {
    if (!tsFile.hasJsdoc(node)) {
      return await this.writeJsdoc(node, tsFile, textEditor);
    }
    return false;
  }
}
