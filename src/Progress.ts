import * as vscode from 'vscode';

/**
 * Progress update object.
 *
 * @export
 * @interface ProgressUpdate
 * @typedef {ProgressUpdate}
 */
export interface ProgressUpdate {
  /**
   * Update message.
   *
   * @type {?string}
   */
  message?: string;
  /**
   * Increment amount, in percentages (10 -> 10%).
   *
   * @type {?number}
   */
  increment?: number
}

/**
 * Wrapper for VSCode {@link vscode.Progress Progress}.
 *
 * @export
 * @interface Progress
 * @typedef {Progress}
 * @extends {vscode.Progress<ProgressUpdate>}
 */
export interface Progress extends vscode.Progress<ProgressUpdate> {}
