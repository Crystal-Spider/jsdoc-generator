import {LanguageService, createLanguageService, createDocumentRegistry, SourceFile, sys, Node, LineAndCharacter, getLineAndCharacterOfPosition, SyntaxKind, PropertyDeclaration, ConstructorDeclaration, AccessorDeclaration, MethodDeclaration, ClassDeclaration, InterfaceDeclaration, EnumDeclaration, VariableDeclarationList, TypeAliasDeclaration, VariableStatement} from 'typescript';
import {TextDocument, TextEditor, window, workspace, SnippetString, Position, WorkspaceEdit, Uri, RelativePattern, CancellationToken} from 'vscode';

import {SUPPORTED_LANGUAGES} from './extension';
import {JsdocBuilder} from './JsdocBuilder';
import {LanguageServiceHost} from './LanguageServiceHost';
import {Progress} from './Progress';
import {TextFile} from './TextFile';
import {TsFile} from './TsFile';

/**
 * Possible scopes when generating JSDocs.
 *
 * @typedef {Scope}
 */
type Scope = 'folder' | 'the workspace';

/**
 * Glob pattern for supported files.
 *
 * @type {string}
 */
const supportedFilesGlob = '**/*.{js,ts,jsx,tsx}';

/**
 * JSDoc Generator.
 *
 * @export
 * @class JsdocGenerator
 * @typedef {JsdocGenerator}
 */
export class JsdocGenerator {
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
  private languageService: LanguageService;

  /**
   * @constructor
   */
  constructor() {
    this.languageServiceHost = new LanguageServiceHost();
    this.languageService = createLanguageService(this.languageServiceHost, createDocumentRegistry());
  }

  /**
   * Generate and insert JSDoc for all supported textFiles in the workspace. 
   * Displays error messages in case of failure in generating the JSDoc.
   *
   * @public
   * @async
   * @param {Progress} progress
   * @param {CancellationToken} token
   * @param {?Uri} [folder]
   * @returns {Promise<void>}
   */
  public async generateJsdocWorkspace(progress: Progress, token: CancellationToken, folder?: Uri): Promise<void> {
    const scope: Scope = folder ? 'folder' : 'the workspace';
    token.onCancellationRequested(() => window.showWarningMessage(`JSDoc generation for ${scope} canceled`));
    try {
      const uris = await workspace.findFiles(folder ? new RelativePattern(folder!, supportedFilesGlob) : supportedFilesGlob);
      // Cancellation check
      if (token.isCancellationRequested) {
        return Promise.resolve();
      }
      if (uris.length > 0) {
        const workspaceEdit = new WorkspaceEdit();
        let jsdocExpectedNumber = 0;
        for (const uri of uris) {
          // Cancellation check
          if (token.isCancellationRequested) {
            return Promise.resolve();
          }
          const textFile = new TextFile(workspaceEdit, uri);
          const textDocument = await textFile.document;
          // Cancellation check
          if (token.isCancellationRequested) {
            return Promise.resolve();
          }
          if (this.isLanguageSupported(textDocument)) {
            const tsFile = this.retrieveTsFile(textDocument);
            const {sourceFile} = tsFile;
            if (sourceFile) {
              jsdocExpectedNumber += await this.writeFileJsdoc(tsFile, sourceFile, textFile, progress, token);
              // Cancellation check
              if (token.isCancellationRequested) {
                return Promise.resolve();
              }
              progress.report({increment: -99.9});
            }
          }
        }
        try {
          // Cancellation check
          if (token.isCancellationRequested) {
            return Promise.resolve();
          }
          const success = await workspace.applyEdit(workspaceEdit);
          if (success || !jsdocExpectedNumber) {
            const jsdocNumber = workspaceEdit.entries().reduce((prev, curr) => prev + curr[1].length, 0);
            if (jsdocNumber > 0) {
              window.showInformationMessage(`Correctly generated ${this.getPluralized(jsdocNumber, 'JSDoc')} for ${this.getPluralized(workspaceEdit.size, 'file')} in ${scope}!`);
            } else {
              window.showWarningMessage('No JSDoc was generated.');
            }
          } else {
            window.showErrorMessage(`Unable to generate JSDoc for ${scope}.`);
          }
        } catch (error) {
          window.showErrorMessage(`Unable to generate JSDoc for ${scope}: ${error}`);
        }
      } else {
        window.showWarningMessage(`No supported file in ${scope}.`);
      }
    } catch (error) {
      window.showErrorMessage(`Unable to generate JSDoc for ${scope}: ${error}`);
    }
    return Promise.resolve();
  }

  /**
   * Generate and insert JSDoc for the given textFile for all the supported nodes.
   * Displays error messages in case of failure in generating the JSDoc.
   *
   * @public
   * @async
   * @template {TextEditor | WorkspaceEdit} T
   * @param {Progress} progress
   * @param {CancellationToken} token
   * @param {TextFile<T>} textFile
   * @returns {Promise<void>}
   */
  public async generateJsdocFile<T extends TextEditor | WorkspaceEdit>(progress: Progress, token: CancellationToken, textFile: TextFile<T>): Promise<void> {
    token.onCancellationRequested(() => window.showWarningMessage('JSDoc generation for the current file canceled'));
    const textDocument = await textFile.document;
    if (this.isLanguageSupported(textDocument)) {
      const tsFile = this.retrieveTsFile(textDocument);
      const {sourceFile} = tsFile;
      if (sourceFile) {
        // Cancellation check
        if (token.isCancellationRequested) {
          return Promise.resolve();
        }
        const jsdocNumber = await this.writeFileJsdoc(tsFile, sourceFile, textFile, progress, token);
        // Cancellation check
        if (token.isCancellationRequested) {
          return Promise.resolve();
        }
        let success = jsdocNumber > 0;
        if (textFile.workspaceEdit) {
          success = success && await workspace.applyEdit(textFile.workspaceEdit);
        }
        if (success) {
          window.showInformationMessage(`Correctly generated ${this.getPluralized(jsdocNumber, 'JSDoc')}!`);
        } else {
          window.showWarningMessage('No JSDoc was generated.');
        }
      } else {
        window.showErrorMessage('Unable to generate JSDoc for the current file.');
      }
    } else {
      window.showErrorMessage(`Unable to generate JSDoc: ${textDocument.languageId} is not supported.`);
    }
    return Promise.resolve();
  }

  /**
   * Generate and insert JSDoc for the given textEditor at the current location.
   * Displays error messages in case of failure in generating the JSDoc.
   *
   * @public
   * @async
   * @param {Progress} progress
   * @param {CancellationToken} token
   * @param {TextEditor} textEditor
   * @returns {Promise<void>}
   */
  public async generateJsdoc(progress: Progress, token: CancellationToken, textEditor: TextEditor): Promise<void> {
    token.onCancellationRequested(() => window.showWarningMessage('JSDoc generation canceled'));
    progress.report({message: 'Generating JSDoc...'});
    if (this.isLanguageSupported(textEditor.document)) {
      const caret = textEditor.selection.start;
      const tsFile = this.retrieveTsFile(textEditor.document, caret);
      const {supportedNode} = tsFile;
      if (supportedNode) {
        await this.writeJsdoc(supportedNode, tsFile, new TextFile(textEditor), token).catch(
          reason => { window.showErrorMessage(`Unable to generate JSDoc at position (Ln ${caret.line}, Col ${caret.character}) because of ${reason}`); }
        );
      } else {
        window.showErrorMessage(`Unable to generate JSDoc at position (Ln ${caret.line}, Col ${caret.character}).`);
      }
    } else {
      window.showErrorMessage(`Unable to generate JSDoc: ${textEditor.document.languageId} is not supported.`);
    }
    return Promise.resolve();
  }

  /**
   * Checks if the language of the document is supported.
   *
   * @private
   * @param {TextDocument} document
   * @returns {boolean} whether the document language is supported.
   */
  private isLanguageSupported(document: TextDocument): boolean {
    return SUPPORTED_LANGUAGES.some(language => language === document.languageId);
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
    this.languageService.getSyntacticDiagnostics(fileName);
    const program = this.languageService.getProgram();
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
   * @async
   * @template {TextEditor | WorkspaceEdit} T
   * @param {Node} node node for which generate the JSDoc.
   * @param {TsFile} tsFile object {@link TsFile} associated with the current file.
   * @param {TextFile<T>} textFile
   * @param {CancellationToken} token
   * @returns {Promise<boolean>} promise that resolves with a value indicating if the snippet could be inserted.
   */
  private async writeJsdoc<T extends TextEditor | WorkspaceEdit>(node: Node, tsFile: TsFile, textFile: TextFile<T>, token: CancellationToken): Promise<boolean> {
    const jsdocLocation = this.getJsdocLocation(tsFile.sourceFile as SourceFile, node);
    // Cancellation check
    if (token.isCancellationRequested) {
      return Promise.resolve(false);
    }
    const jsdoc = await this.buildJsdoc(node, tsFile);
    // Cancellation check
    if (token.isCancellationRequested) {
      return Promise.resolve(false);
    }
    return this.insertJsdoc(jsdoc, jsdocLocation, textFile);
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
   * @async
   * @param {Node} node
   * @param {TsFile} tsFile
   * @returns {Promise<SnippetString>} promise that resolves with the JSDoc built.
   */
  private async buildJsdoc(node: Node, tsFile: TsFile) {
    const jsdocBuilder = new JsdocBuilder(tsFile);
    switch (node.kind) {
      case SyntaxKind.PropertySignature:
      case SyntaxKind.PropertyDeclaration:
        return await jsdocBuilder.getPropertyDeclarationJsdoc(node as PropertyDeclaration);
      case SyntaxKind.Constructor:
        return await jsdocBuilder.getConstructorJsdoc(node as ConstructorDeclaration);
      case SyntaxKind.GetAccessor:
      case SyntaxKind.SetAccessor:
        return await jsdocBuilder.getAccessorDeclarationJsdoc(node as AccessorDeclaration);
      case SyntaxKind.MethodSignature:
      case SyntaxKind.MethodDeclaration:
      case SyntaxKind.CallSignature:
      case SyntaxKind.FunctionExpression:
      case SyntaxKind.ArrowFunction:
      case SyntaxKind.FunctionDeclaration:
        return await jsdocBuilder.getMethodDeclarationJsdoc(node as MethodDeclaration);
      case SyntaxKind.ClassDeclaration:
        return await jsdocBuilder.getClassLikeDeclarationJsdoc(node as ClassDeclaration);
      case SyntaxKind.InterfaceDeclaration:
        return await jsdocBuilder.getClassLikeDeclarationJsdoc(node as InterfaceDeclaration);
      case SyntaxKind.TypeAliasDeclaration:
        return await jsdocBuilder.getTypeAliasJsdoc(node as TypeAliasDeclaration);
      case SyntaxKind.EnumDeclaration:
        return await jsdocBuilder.getEnumDeclarationJsdoc(node as EnumDeclaration);
      case SyntaxKind.VariableStatement:
        return await jsdocBuilder.getPropertyDeclarationJsdoc(((node as VariableStatement).declarationList as VariableDeclarationList).declarations[0]);
      case SyntaxKind.VariableDeclarationList:
        return await jsdocBuilder.getPropertyDeclarationJsdoc((node as VariableDeclarationList).declarations[0]);
      case SyntaxKind.EnumMember:
      default:
        return await jsdocBuilder.emptyJsdoc();
    }
  }

  /**
   * Inserts the JSDoc snipper at the given location for the given textEditor.
   *
   * @private
   * @template {TextEditor | WorkspaceEdit} T
   * @param {SnippetString} jsdoc
   * @param {LineAndCharacter} location
   * @param {TextFile<T>} textFile
   * @returns {Thenable<boolean>} promise that resolves with a value indicating if the snippet could be inserted.
   */
  private insertJsdoc<T extends TextEditor | WorkspaceEdit>(jsdoc: SnippetString, location: LineAndCharacter, textFile: TextFile<T>): Thenable<boolean> {
    return textFile.insert(jsdoc, new Position(location.line, location.character));
  }

  /**
   * For the given sourceFile, iteratively calls {@link JsdocGenerator.writeJsdoc} with a bottom up approach for every supported node without a JSDoc.
   *
   * @private
   * @async
   * @template {TextEditor | WorkspaceEdit} T
   * @param {TsFile} tsFile
   * @param {SourceFile} sourceFile
   * @param {TextFile<T>} textFile
   * @param {Progress} progress
   * @param {CancellationToken} token
   * @returns {Promise<number>} {@link Promise} with the number of JSDocs generated.
   */
  private async writeFileJsdoc<T extends TextEditor | WorkspaceEdit>(tsFile: TsFile, sourceFile: SourceFile, textFile: TextFile<T>, progress: Progress, token: CancellationToken): Promise<number> {
    let jsdocNumber = 0;
    // Iterated bottom up to avoid shifting of start position of nodes.
    for (let c = sourceFile.statements.length - 1; c >= 0; c--) {
      const statement = sourceFile.statements[c];
      if (tsFile.isNodeSupported(statement)) {
        if (statement.kind === SyntaxKind.ClassExpression || statement.kind === SyntaxKind.ClassDeclaration || statement.kind === SyntaxKind.InterfaceDeclaration) {
          const {members} = statement as ClassDeclaration;
          for (let k = members.length - 1; k >= 0; k--) {
            // Cancellation check
            if (token.isCancellationRequested) {
              return Promise.resolve(jsdocNumber);
            }
            jsdocNumber += +(await this.writeJsdocConditionally(members[k], tsFile, textFile, token));
            // Cancellation check
            if (token.isCancellationRequested) {
              return Promise.resolve(jsdocNumber);
            }
            progress.report({
              message: `Generating JSDoc for ${tsFile.sourceFile?.fileName} file...`,
              increment: 100 / sourceFile.statements.length / members.length
            });
          }
        }
        // Cancellation check
        if (token.isCancellationRequested) {
          return Promise.resolve(jsdocNumber);
        }
        jsdocNumber += +(await this.writeJsdocConditionally(statement, tsFile, textFile, token));
        // Cancellation check
        if (token.isCancellationRequested) {
          return Promise.resolve(jsdocNumber);
        }
        progress.report({
          message: `Generating JSDoc for ${tsFile.sourceFile?.fileName} file...`,
          increment: 100 / sourceFile.statements.length
        });
      }
    }
    return jsdocNumber;
  }

  /**
   * Checks whether to write the JSDoc for the given node or not.
   *
   * @private
   * @async
   * @template {TextEditor | WorkspaceEdit} T
   * @param {Node} node
   * @param {TsFile} tsFile
   * @param {TextFile<T>} textFile
   * @param {CancellationToken} token
   * @returns {Promise<boolean>} {@link Promise} with whether the JSDoc has been written.
   */
  private async writeJsdocConditionally<T extends TextEditor | WorkspaceEdit>(node: Node, tsFile: TsFile, textFile: TextFile<T>, token: CancellationToken): Promise<boolean> {
    if (!tsFile.hasJsdoc(node)) {
      return await this.writeJsdoc(node, tsFile, textFile, token);
    }
    return false;
  }

  /**
   * Returns the pluralized version of the `name` along with the `amount` prefixed.
   *
   * @private
   * @param {number} amount
   * @param {string} name
   * @param {string} [suffix='s']
   * @returns {string}
   */
  private getPluralized(amount: number, name: string, suffix = 's'): string {
    return `${amount} ${name}${(amount > 1 ? suffix : '')}`;
  }
}
