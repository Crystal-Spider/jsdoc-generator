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
	  }
	 }

	 /**
	  * Checks if the language of the document passed as parameter is one of the supported ones.
	  *
	  * @param {TextDocument} document
	  * @returns {boolean}
	  */
	 private isLanguageSupported(document: TextDocument): boolean {
	  return this.languages.some((language) => language === document.languageId);
	 }
}
