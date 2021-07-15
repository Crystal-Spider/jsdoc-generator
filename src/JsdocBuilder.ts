import {Node, SyntaxKind, NodeArray, TypeNode, ExpressionWithTypeArguments} from 'typescript';
import * as ts from 'typescript';
import {SnippetString, workspace} from 'vscode';

import {TsFile} from './TsFile';

/**
 * JSDoc builder
 *
 * @export
 * @class
 * @typedef {JsdocBuilder}
 */
export class JsdocBuilder {
  /**
   * Snippet string containing the whole JSDoc.
   *
   * @private
   * @readonly
   * @type {SnippetString}
   */
	private readonly jsdoc: SnippetString = new SnippetString();

	/**
	 * Object representing the TypeScript File currently working on.
	 *
	 * @private
	 * @type {TsFile}
	 */
	private tsFile: TsFile;

	/**
	 * @constructor
	 * @param {TsFile} tsFile
	 */
	constructor(tsFile: TsFile) {
	  this.tsFile = tsFile;
	}

 	/**
 	 * Builds and returns the JSDoc for classes and interfaces.
 	 *
 	 * @public
 	 * @param {ts.ClassDeclaration | ts.InterfaceDeclaration} node {@link ts.Node} representing a
 	 * {@link ts.ClassDeclaration} or a {@link ts.InterfaceDeclaration}.
 	 * @returns {SnippetString} the jsdoc
 	 */
	public getClassLikeDeclarationJsdoc(node: ts.ClassDeclaration | ts.InterfaceDeclaration): SnippetString {
  	this.buildJsdocHeader();
  	this.buildJsdocModifiers(node);
  	if(node.name) {
	    this.buildJsdocLine(node.kind === SyntaxKind.ClassDeclaration ? 'class' : 'interface', node.name.getText(), '');
  		this.buildJsdocLine('typedef', node.name.getText());
	  } else {
	    this.buildJsdocLine(node.kind === SyntaxKind.ClassDeclaration ? 'class' : 'interface');
	  }
  	this.buildJsdocHeritage(node);
	  if(node.typeParameters) {
	    this.buildJsdocLines('template', node.typeParameters.map((typeParameter) => typeParameter.getText()), '');
	  }
  	this.buildJsdocEnd();
  	return this.jsdoc;
 	}

	/**
	 * Builds and returns the JSDoc for property declarations.
	 *
	 * @public
	 * @param {ts.PropertyDeclaration} node
	 * @returns {SnippetString}
	 */
	public getPropertyDeclarationJsdoc(node: ts.PropertyDeclaration): SnippetString {
	  // TODO: add configuration to document arrow function as functions and not properties.
	  this.buildJsdocHeader();
	  this.buildJsdocModifiers(node);
	  this.buildJsdocType(node);
	  this.buildJsdocEnd();
 	  return this.jsdoc;
 	}

	public getAccessorDeclarationJsdoc(node: ts.AccessorDeclaration): SnippetString {
	  this.buildJsdocHeader();
 	  this.buildJsdocModifiers(node);
	  this.buildJsdocType(node);
 	  this.buildJsdocEnd();
 	  return this.jsdoc;
	}

 	/**
 	 * Builds a new JSDoc line for each modifier applied on the node.
 	 *
 	 * @private
 	 * @param {Node} node
 	 */
 	private buildJsdocModifiers(node: Node) {
  	if(node.modifiers && node.modifiers.length > 0) {
  		node.modifiers.forEach((modifier) => {
  			switch(modifier.kind) {
  				case SyntaxKind.ExportKeyword:
  					this.buildJsdocLine('export');
  					break;
  				case SyntaxKind.PrivateKeyword:
  					this.buildJsdocLine('private');
  					break;
  				case SyntaxKind.ProtectedKeyword:
  					this.buildJsdocLine('protected');
  					break;
  				case SyntaxKind.PublicKeyword:
  					this.buildJsdocLine('public');
  					break;
  				case SyntaxKind.StaticKeyword:
  					this.buildJsdocLine('static');
  					break;
  				case SyntaxKind.AbstractKeyword:
  					this.buildJsdocLine('abstract');
  					break;
  				case SyntaxKind.AsyncKeyword:
  					this.buildJsdocLine('async');
  					break;
  				case SyntaxKind.ReadonlyKeyword:
  					this.buildJsdocLine('readonly');
  					break;
  				case SyntaxKind.OverrideKeyword:
  					this.buildJsdocLine('override');
  					break;
  				default: break;
  			}
  		});
  	}
 	}

	/**
	 * Given the node, builds the type tag and value adding parenthesis when needed.
	 *
	 * @private
	 * @param {ts.PropertyDeclaration | ts.AccessorDeclaration} node
	 */
	private buildJsdocType(node: ts.PropertyDeclaration | ts.AccessorDeclaration) {
	  const type = this.retrieveType(node);
	  if(this.checkParenthesisUse(type)) {
	    this.buildJsdocLine('type', type.charAt(0) + '(' + type.substring(1) + ')');
	  } else {
	    this.buildJsdocLine('type', type);
	  }
	}

	/**
	 * Retrieves a string representing the type of the given node.
	 *
	 * @private
	 * @param {(ts.PropertyDeclaration | ts.AccessorDeclaration)} node
	 * @returns {string} string representing the node type.
	 */
	private retrieveType(node: ts.PropertyDeclaration | ts.AccessorDeclaration): string {
	  const prefix = this.getTypePrefix(<ts.PropertyDeclaration>node);
	  if(!node.type) {
	    return prefix + this.inferType(node);
	  }
	  if(node.type.getText() === 'any') {
	    return prefix + '*';
	  }
	  return prefix + node.type.getText();
	}

	/**
	 * Check if the type of the node has a modifier and returns it.
	 *
	 * @private
	 * @param {ts.PropertyDeclaration} node
	 * @returns {string} type modifier [?, !], empty if none.
	 */
	private getTypePrefix(node: ts.PropertyDeclaration): string {
	  if(node.questionToken) {
	    return '?';
	  }
	  if(node.exclamationToken) {
	    return '!';
	  }
	  return '';
	}

	/**
	 * Checks whether or not to use parenthesis to wrap union and intersection types.
	 *
	 * @private
	 * @param {string} type
	 * @returns {boolean}
	 */
	private checkParenthesisUse(type: string): boolean {
	  return (
	    (type.includes('|') || type.includes('&')) &&
			(
			  workspace.getConfiguration().get('jsdoc-generator.includeParenthesisForMultipleTypes', true) ||
				type.includes('?') || type.includes('!')
			)
	  );
	}

 	private buildJsdocHeritage(node: ts.ClassDeclaration | ts.InterfaceDeclaration) {
  	if(node.heritageClauses) {
  		node.heritageClauses.forEach((heritageClause) => {
  			switch(heritageClause.token) {
  				case SyntaxKind.ExtendsKeyword:
  					this.buildJsdocLines('extends', this.getMultipleTypes(heritageClause.types));
  					break;
  				case SyntaxKind.ImplementsKeyword:
  					this.buildJsdocLines('implements', this.getMultipleTypes(heritageClause.types));
  					break;
  				default: break;
  			}
  		});
  	}
 	}

 	private getMultipleTypes(types: NodeArray<ExpressionWithTypeArguments>): string[] {
 	  return types.map((type) => type.expression.getText() + this.getTypeArguments(type.typeArguments));
 	}

 	private getTypeArguments(typeArguments: NodeArray<TypeNode> | undefined): string {
 	  return typeArguments ? '<' + typeArguments.map((typeArgument) => typeArgument.getText()).join(', ') + '>' : '';
 	}

	/**
	 * Calls tsFile.inferType() and formats the result for JSDoc.
	 *
	 * @private
	 * @param {Node} node
	 * @returns {string}
	 */
	private inferType(node: Node): string {
	  const inferredType = this.tsFile.inferType(node);
	  return (inferredType === '' || inferredType === 'any') ? '*' : inferredType;
	}

	/**
	 * Snippet string with an empty JSDoc.
	 *
	 * @public
	 * @readonly
	 * @type {SnippetString}
	 */
 	public get emptyJsdoc(): SnippetString {
	  this.buildJsdocHeader();
 	  this.buildJsdocEnd();
  	return this.jsdoc;
 	}

	/**
	 * Builds a JSDoc header including the starting line.
	 *
	 * @private
	 */
 	private buildJsdocHeader() {
  	this.jsdoc.appendText('/**\n');
  	this.buildDescription();
  	this.buildAuthor();
  	this.buildDate();
  	this.buildJsdocLine();
 	}

 	/**
 	 * Builds a line starting with a space and a configurable placeholder for a JSDoc description.
 	 *
 	 * @private
 	 */
 	private buildDescription() {
  	this.jsdoc.appendText(' * ');
 	  if(workspace.getConfiguration().get('jsdoc-generator.includeDescriptionPlaceholder', true)) {
 	    this.jsdoc.appendPlaceholder(
 	      workspace.getConfiguration().get('jsdoc-generator.descriptionPlaceholder', 'Description placeholder')
 	    );
 	  }
  	this.jsdoc.appendText('\n');
 	}

 	/**
 	 * If configured to do so, builds a line with the author tag and configured value.
 	 *
 	 * @private
 	 */
 	private buildAuthor() {
 	  if(workspace.getConfiguration().get('jsdoc-generator.includeAuthor', false)) {
 	    this.buildJsdocLine('author', workspace.getConfiguration().get('jsdoc-generator.author', 'Insert author'), '');
 	  }
 	}

 	/**
 	 * If configured to do so, builds a line with the date tag and configured value.
 	 *
 	 * @private
 	 */
 	private buildDate() {
 	  if(workspace.getConfiguration().get('jsdoc-generator.includeDate', false)) {
 	    const date = new Date();
	    let tagValue = date.toLocaleDateString();
	    if(workspace.getConfiguration().get('jsdoc-generator.includeTime', false)) {
	      tagValue += ' - ' + date.toLocaleTimeString();
	    }
 	  	this.buildJsdocLine('date', tagValue, '');
 	  }
 	}

 	/**
 	 * Builds the ending line of a JSDoc.
 	 *
 	 * @private
 	 */
 	private buildJsdocEnd() {
  	this.jsdoc.appendText(' */\n');
 	}

	/**
	 * Builds multiple lines for a JSDoc.
	 * When using all the default values, an empty JSDoc line is built.
	 * It is possible to create several empty JSDoc lines by setting tagValues as an array with several empty strings.
	 * The same tag and wrapper will be used for all tagValues in separate lines.
	 *
	 * @private
	 * @param {string} [tag=''] JSDoc tag to insert.
	 * @param {string[]} [tagValues=['']] JSDoc tag values to insert
	 * @param {string} [wrapper='{}'] A string used to wrap the tagValue. Should be of even elements and symmetrical.
	 */
 	private buildJsdocLines(tag = '', tagValues: string[] = [''], wrapper = '{}') {
	  tagValues.forEach((tagValue) => {
	    this.buildJsdocLine(tag, tagValue, wrapper);
	  });
	}

	/**
	 * Builds a single line for a JSDoc.
	 * When using all the default values, an empty JSDoc line is built.
	 * When setting wrapper to '', the tagValue is not wrapped.
	 *
	 * @private
	 * @param {string} [tag=''] JSDoc tag to insert.
	 * @param {string} [tagValue=''] JSDoc tag value to insert.
	 * @param {string} [wrapper='{}'] A string used to wrap the tagValue. Should be of even elements and symmetrical.
	 */
	private buildJsdocLine(tag = '', tagValue = '', wrapper = '{}') {
	  let open = '', close = '';
	  if(!!wrapper) {
		 const middle = wrapper.length / 2;
	    open = wrapper.substring(0, middle);
	    close = wrapper.substring(middle);
	  }
	 this.jsdoc.appendText(' *' + (!!tag ? ` @${tag}` : '') + (!!tagValue ? ` ${open}${tagValue}${close}` : '') + '\n');
	 if(!!tagValue && wrapper === '{}') {
		 // Remove '\' that comes from .appendText() escaping '}'.
		 const backslashIndex = this.jsdoc.value.indexOf('\\');
		 this.jsdoc.value = this.jsdoc.value.substring(0, backslashIndex) + this.jsdoc.value.substring(backslashIndex + 1);
	 }
	}
}
