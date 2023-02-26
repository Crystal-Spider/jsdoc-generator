import * as ts from 'typescript';

/**
 * File interface.
 *
 * @interface File
 */
interface File {
  /**
   * File text.
   *
   * @type {string}
   */
  text: string,
  /**
   * File version.
   * Should increase with every change to {@link File.text}.
   *
   * @type {number}
   */
  version: number
}

/**
 * Handles all interactions between the Language Service and the external world.
 *
 * @typedef {LanguageServiceHost}
 */
export class LanguageServiceHost implements ts.LanguageServiceHost {
  /**
   * List of all files.
   *
   * @private
   * @type {{[fileName: string]: File}}
   */
  private files: {[fileName: string]: File};

  /**
   * Initializes the list of files.
   *
   * @constructor
   */
  constructor() {
    this.files = {};
  }

  /**
   * Checks whether the specified file is in the files list or not.
   *
   * @public
   * @param {string} fileName
   * @returns {boolean}
   */
  public fileExists(fileName: string): boolean {
    return !!this.files[fileName];
  }

  /**
   * Returns the raw text of the specified file, if in the files list, undefined otherwise.
   *
   * @public
   * @param {string} fileName
   * @returns {string | undefined}
   */
  public readFile(fileName: string): string | undefined {
    return this.files[fileName] && this.files[fileName].text;
  }

  /**
   * Updates the text of the specified file and increases its version, if in the files list.
   * If not in the files list, adds the file to the list, sets its text as specified and sets its version to 0.
   *
   * @public
   * @param {string} fileName
   * @param {string} fileText
   */
  public updateFile(fileName: string, fileText: string) {
    if(this.fileExists(fileName)) {
      this.files[fileName].text = fileText;
      this.files[fileName].version++;
    } else {
      this.files[fileName] = {
        text: fileText,
        version: 0
      };
    }
  }

  /**
   * Removes the specified file from the files list.
   *
   * @public
   * @param {string} fileName
   */
  public removeFile(fileName: string) {
    delete this.files[fileName];
  }

  /**
   * Returns all file names.
   *
   * @public
   * @returns {string[]} File names.
   */
  public getScriptFileNames(): string[] {
    return Object.keys(this.files);
  }

  /**
   * Returns the version for the requested file, if in the files list, 'NaN' otherwise.
   *
   * @public
   * @param {string} fileName
   * @returns {string} File version.
   */
  public getScriptVersion(fileName: string): string {
    return this.files[fileName] ? this.files[fileName].version.toString() : NaN.toString();
  }

  /**
   * Returns the current state of the text of the requested file, if in the files list, undefined otherwise.
   *
   * @public
   * @param {string} fileName
   * @returns {ts.IScriptSnapshot | undefined} Script snapshot or undefined.
   */
  public getScriptSnapshot(fileName: string): ts.IScriptSnapshot | undefined {
    return this.files[fileName] ? ts.ScriptSnapshot.fromString(this.files[fileName].text) : undefined;
  }

  /**
   * Returns the source file of the requeste file, if in the files list, null otherwise.
   *
   * @public
   * @param {string} fileName
   * @param {ts.ScriptTarget} langVersion defaults to {@link ts.ScriptTarget.Latest}.
   * @returns {ts.SourceFile | null}
   */
  public getSourceFile(fileName: string, langVersion: ts.ScriptTarget = ts.ScriptTarget.Latest): ts.SourceFile | null {
    return this.files[fileName] ? ts.createSourceFile(fileName, this.files[fileName].text, langVersion) : null;
  }

  /**
   * Returns the current working directory.
   *
   * @public
   * @returns {string} Current working directory.
   */
  public getCurrentDirectory(): string {
    return process.cwd();
  }

  /**
   * Returns the Compiler Settings.
   *
   * @public
   * @returns {ts.CompilerOptions} Compiler Options.
   */
  public getCompilationSettings(): ts.CompilerOptions {
    return {
      allowJs: true
    };
  }

  /**
   * Get the path of the default library files (lib.d.ts) as distributed with the typescript node package.
   * Not supported if the ts module is consumed outside of a node module.
   *
   * @public
   * @param {ts.CompilerOptions} options compiler Options.
   * @returns {string} Path of the default library files.
   */
  public getDefaultLibFileName(options: ts.CompilerOptions): string {
    return ts.getDefaultLibFilePath(options);
  }
}
