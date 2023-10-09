import {Position, SnippetString, TextDocument, TextEditor, Uri, WorkspaceEdit, workspace} from 'vscode';

/**
 * Wrapper for editing text files.
 *
 * @export
 * @class TextFile
 * @typedef {TextFile}
 * @template {TextEditor | WorkspaceEdit} T
 */
export class TextFile<T extends TextEditor | WorkspaceEdit> {
  /**
   * File {@link Uri}.
   *
   * @private
   * @type {Uri}
   */
  private uri: Uri;

  /**
   * File {@link TextDocument}.
   *
   * @public
   * @readonly
   * @type {Thenable<TextDocument>}
   */
  public get document(): Thenable<TextDocument> {
    if ('document' in this.instance) {
      return Promise.resolve(this.instance.document);
    }
    return workspace.openTextDocument(this.uri);
  }

  /**
   * The workspace edit instance, `null` if none.
   *
   * @public
   * @readonly
   * @type {WorkspaceEdit | null}
   */
  public get workspaceEdit(): WorkspaceEdit | null {
    if ('document' in this.instance) {
      return null;
    }
    return this.instance;
  }

  /**
   * @constructor
   * @param {T} instance
   * @param {?Uri} [uri]
   */
  constructor(private instance: T, uri?: Uri) {
    if ('document' in this.instance) {
      this.uri = this.instance.document.uri;
    } else {
      this.uri = uri!;
    }
  }

  /**
   * Inserts the given `snippet` at the given `position`.
   *
   * @public
   * @param {SnippetString} snippet
   * @param {Position} position
   * @returns {Thenable<boolean>}
   */
  public insert(snippet: SnippetString, position: Position): Thenable<boolean> {
    if ('insertSnippet' in this.instance) {
      return this.instance.insertSnippet(snippet, position);
    }
    this.instance.insert(this.uri, position, snippet.value);
    return Promise.resolve(true);
  }
}
