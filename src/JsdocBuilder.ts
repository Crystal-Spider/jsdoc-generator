import {Node, SyntaxKind, NodeArray, TypeNode, ExpressionWithTypeArguments} from 'typescript';
import * as ts from 'typescript';
import {SnippetString} from 'vscode';

import {getConfig} from './extension';
import {TsFile} from './TsFile';
import {UndefTemplate} from './UndefTemplate';

/**
 * Utility type to group all {@link Node}s that can have a TypeScript type.
 *
 * @typedef {typedNode}
 */
type typedNode = ts.PropertyDeclaration | ts.AccessorDeclaration | ts.ParameterDeclaration | ts.MethodDeclaration;

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
	  this.buildJsdocLine('type', this.retrieveType(node));
	  this.buildJsdocEnd();
 	  return this.jsdoc;
 	}

	/**
	 * Builds and returns the JSDoc for accessor declarations.
	 *
	 * @param {ts.AccessorDeclaration} node
	 * @returns {SnippetString}
	 */
	public getAccessorDeclarationJsdoc(node: ts.AccessorDeclaration): SnippetString {
	  const otherAccessorKind = node.kind === SyntaxKind.GetAccessor ? SyntaxKind.SetAccessor : SyntaxKind.GetAccessor;
	  const accessorName = node.name.getText();
	  const accessorParent = <ts.ClassLikeDeclaration>node.parent;
	  const pairedAccessor = <ts.AccessorDeclaration>accessorParent.members
	    .find((member) => member.kind === otherAccessorKind && member.name && member.name.getText() === accessorName);
	  if(pairedAccessor && ts.getJSDocTags(pairedAccessor).length > 0) {
	    this.jsdoc.appendText('/**\n');
	    const pairedJsDoc = <ts.JSDoc>ts.getJSDocTags(pairedAccessor)[0].parent;
	    this.buildDescription(pairedJsDoc.comment ? ts.getTextOfJSDocComment(pairedJsDoc.comment) : '');
	  } else {
	    this.buildJsdocHeader();
	    this.buildJsdocModifiers(node);
	    if(node.kind === SyntaxKind.GetAccessor && !pairedAccessor) {
	      this.buildJsdocLine('readonly');
	    }
	    this.buildJsdocLine('type', this.retrieveType(node));
	  }
	  this.buildJsdocEnd();
 	  return this.jsdoc;
	}

	/**
	 * Builds and returns the JSDoc for enum declarations.
	 *
	 * @param {ts.EnumDeclaration} node
	 * @returns {SnippetString}
	 */
	public getEnumDeclarationJsdoc(node: ts.EnumDeclaration): SnippetString {
	  this.buildJsdocHeader();
	  this.buildJsdocModifiers(node);
	  this.buildJsdocLine('enum', 'number');
	  this.buildJsdocEnd();
	  return this.jsdoc;
	}

	/**
	 * Builds and returns the JSDoc for method declarations.
	 *
	 * @param {ts.MethodDeclaration} node
	 * @returns {SnippetString}
	 */
	public getMethodDeclarationJsdoc(node: ts.MethodDeclaration): SnippetString {
	  this.buildJsdocHeader();
	  this.buildJsdocModifiers(node);
	  if(node.typeParameters) {
	    this.buildJsdocLines('template', node.typeParameters.map((typeParameter) => typeParameter.getText()), '');
	  }
	  this.buildJsdocParameters(node);
	  this.buildJsdocReturn(node);
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
	 * Builds all heritage clauses for a class or interface declaration.
	 *
	 * @private
	 * @param {(ts.ClassDeclaration | ts.InterfaceDeclaration)} node
	 */
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

	/**
	 * Builds all parameters for method declarations, including constructors and arrow functions.
	 *
	 * @private
	 * @param {(ts.MethodDeclaration | ts.ConstructorDeclaration)} node
	 */
	private buildJsdocParameters(node: ts.MethodDeclaration | ts.ConstructorDeclaration) {
	  const mappedParameters = node.parameters.map((parameter) => {
	    let name = parameter.name.getText();
	    const type = this.retrieveType(parameter);
	    const initializer = parameter.initializer ? ('=' + parameter.initializer.getText()) : '';
	    const isOptional = !!parameter.questionToken || !!initializer;
	    if(isOptional) {
	      name = '[' + name + initializer + ']';
	    }
	    return {
	      type,
	      name
	    };
	  });
	  const parametersTypes = mappedParameters.map((param) => param.type);
	  const parametersNames = mappedParameters.map((param) => param.name);
	  this.buildJsdocLines('param', parametersTypes, '{}', parametersNames);
	}

	/**
	 * Builds the return value, if present, for the given method.
	 *
	 * @private
	 * @param {ts.MethodDeclaration} node
	 */
	private buildJsdocReturn(node: ts.MethodDeclaration) {
	  let returnType;
	  if(node.type) {
	    returnType = node.type.getText();
	  } else {
	    const functionType = this.inferType(node);
	    returnType = functionType.substring(functionType.split('=> ')[0].length + 3);
	  }
	  if(returnType === 'any') {
	    returnType = '*';
	  }
	  if(returnType !== 'void') {
	    this.buildJsdocLine('returns', returnType);
	  }
	}

	/**
	 * Snippet string with an empty JSDoc.
	 *
	 * @public
	 * @readonly
	 * @type {SnippetString}
	 */
 	public get emptyJsdoc(): SnippetString {
	  this.buildJsdocHeader(false);
 	  this.buildJsdocEnd();
  	return this.jsdoc;
 	}

	/**
	 * Builds a JSDoc header including the starting line.
	 *
	 * @private
	 * @param {boolean} [addNewLine=true]
	 */
 	private buildJsdocHeader(addNewLine: boolean = true) {
  	this.jsdoc.appendText('/**\n');
	  this.buildDescription();
	  this.buildDate();
	  this.buildAuthor();
	  if(addNewLine) {
	    this.buildJsdocLine();
	  }
 	}

 	/**
 	 * Builds a line starting with a space and a configurable placeholder for a JSDoc description.
 	 *
 	 * @private
 	 * @param {string} [description='']
 	 */
	private buildDescription(description: string = '') {
  	this.jsdoc.appendText(' * ');
	  if(description) {
	    this.jsdoc.appendText(description);
	  } else if(getConfig<boolean>('jsdoc-generator.includeDescriptionPlaceholder', true)) {
 	    this.jsdoc.appendPlaceholder(
	      getConfig<string>('jsdoc-generator.descriptionPlaceholder', 'Description placeholder')
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
 	  if(getConfig<boolean>('jsdoc-generator.includeAuthor', false)) {
 	    this.buildJsdocLine('author', getConfig<string>('jsdoc-generator.author', 'Insert author'), '');
 	  }
 	}

 	/**
 	 * If configured to do so, builds a line with the date tag and configured value.
 	 *
 	 * @private
 	 */
 	private buildDate() {
 	  if(getConfig<boolean>('jsdoc-generator.includeDate', false)) {
 	    const date = new Date();
	    let tagValue = date.toLocaleDateString();
	    if(getConfig<boolean>('jsdoc-generator.includeTime', false)) {
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
	 * tagValues and extraValues are used in order as found in the array.
	 *
	 * @private
	 * @param {string} [tag=''] JSDoc tag to insert.
	 * @param {string[]} [tagValues=['']] JSDoc tag values to insert.
	 * @param {string} [wrapper='{}'] A string used to wrap the tagValue. Should be of even elements and symmetrical.
	 * @param {string[]} [extraValues=[]] Extra values for each tag line.
	 */
	private buildJsdocLines(
		 tag: string = '',
		 tagValues: string[] = [''],
		 wrapper: string = '{}',
		 extraValues: string[] = []
	) {
	  tagValues.forEach((tagValue, index) => {
	    const extraValue = extraValues[index] ? extraValues[index] : '';
	    this.buildJsdocLine(tag, tagValue, wrapper, extraValue);
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
	 * @param {string} [extraValue=''] An extra value to add to the line.
	 */
	private buildJsdocLine(tag: string = '', tagValue: string = '', wrapper: string = '{}', extraValue: string = '') {
	  let open = '', close = '', line = '';
	  if(!!wrapper) {
		  const middle = wrapper.length / 2;
	    open = wrapper.substring(0, middle);
	    close = wrapper.substring(middle);
	  }
	  if(tag) {
	    line += ' @' + tag;
	    if(tagValue) {
	      line += ' ' + open + tagValue + close;
	      if(extraValue) {
	        line += ' ' + extraValue;
	      }
	    }
	  }
	  this.jsdoc.appendText(' *' + line + '\n');
	  if(!!tagValue && wrapper === '{}') {
	    // Remove '\' that comes from .appendText() escaping '}'.
	    const backslashIndex = this.jsdoc.value.indexOf('\\');
	    this.jsdoc.value = this.jsdoc.value.substring(0, backslashIndex) + this.jsdoc.value.substring(backslashIndex + 1);
	  }
	}

	/**
	 * Maps each {@link ExpressionWithTypeArguments} with its type and eventual type arguments.
	 *
	 * @private
	 * @param {NodeArray<ExpressionWithTypeArguments>} types
	 * @returns {string[]}
	 */
	private getMultipleTypes(types: NodeArray<ExpressionWithTypeArguments>): string[] {
	  return types.map((type) => type.expression.getText() + this.getTypeArguments(type.typeArguments));
	}

	/**
	 * If any, returns all the type arguments formatted for JSDoc, otherwise returns '';
	 *
	 * @private
	 * @param {UndefTemplate<NodeArray<TypeNode>>} typeArguments
	 * @returns {string}
	 */
	private getTypeArguments(typeArguments: UndefTemplate<NodeArray<TypeNode>>): string {
	  return typeArguments ? '<' + typeArguments.map((typeArgument) => typeArgument.getText()).join(', ') + '>' : '';
	}

	/**
	 * Retrieves a string representing the type of the given node.
	 *
	 * @private
	 * @param {typedNode} node
	 * @returns {string} string representing the node type.
	 */
	private retrieveType(node: typedNode): string {
	  let type;
	  const prefix = this.getTypePrefix(node);
	  if(!node.type) {
	    type = this.inferType(node);
	  } else if(node.type.getText() === 'any') {
	    type = '*';
	  } else {
	    type = node.type.getText();
	  }
	  if(this.checkParenthesisUse(prefix, type)) {
	    type = '(' + type + ')';
	  }
	  return prefix + type;
	}

	/**
	 * Check if the type of the node has a modifier and returns it.
	 *
	 * @private
	 * @param {typedNode} node
	 * @returns {string} type modifier [?, !, ..., *], empty if none.
	 */
	private getTypePrefix(node: typedNode): string {
	  if(node.questionToken) {
	    return '?';
	  }
	  if((<ts.PropertyDeclaration>node).exclamationToken) {
	    return '!';
	  }
	  if((<ts.ParameterDeclaration>node).dotDotDotToken) {
	    return '...';
	  }
	  if((<ts.AccessorDeclaration>node).asteriskToken) {
	    return '*';
	  }
	  return '';
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
	 * Checks whether or not to use parenthesis to wrap union and intersection types.
	 *
	 * @private
	 * @param {string} prefix
	 * @param {string} type
	 * @returns {boolean}
	 */
	private checkParenthesisUse(prefix: string, type: string): boolean {
	  return (
	    (type.includes('|') || type.includes('&')) &&
			(
			  getConfig<boolean>('jsdoc-generator.includeParenthesisForMultipleTypes', true) ||
				prefix !== ''
			)
	  );
	}
}
