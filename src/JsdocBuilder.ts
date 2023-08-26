import {getTextOfJSDocComment, Node, SyntaxKind, NodeArray, TypeNode, ExpressionWithTypeArguments, TypeParameterDeclaration, HeritageClause, AccessorDeclaration, ClassDeclaration, ClassLikeDeclaration, ConstructorDeclaration, EnumDeclaration, InterfaceDeclaration, MethodDeclaration, ParameterDeclaration, PropertyDeclaration, TypeAliasDeclaration, VariableDeclaration, ModifierLike} from 'typescript';
import {SnippetString} from 'vscode';

import {getConfig} from './extension';
import {GenerativeAPI} from './GenerativeAPI';
import {TsFile} from './TsFile';

/**
 * Utility type to group all {@link Node}s that can have a TypeScript type.
 *
 * @typedef {TypedNode}
 */
type TypedNode =
  | PropertyDeclaration
  | AccessorDeclaration
  | ParameterDeclaration
  | MethodDeclaration
  | VariableDeclaration;

/**
 * JSDoc builder.
 *
 * @export
 * @class JsdocBuilder
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
   * Snippet string with an empty JSDoc.
   *
   * @public
   * @async
   * @param {Node} node
   * @returns {Promise<SnippetString>}
   */
  public async emptyJsdoc(node: Node): Promise<SnippetString> {
    await this.buildJsdocHeader(node.getFullText());
    this.buildJsdocEnd();
    return this.jsdoc;
  }

  /**
   * Whether to include types in the JSDoc.
   *
   * @private
   * @readonly
   * @type {boolean}
   */
  private get includeTypes(): boolean {
    return getConfig('includeTypes', true);
  }

  /**
   * @constructor
   * @param {TsFile} tsFile
   */
  constructor(private readonly tsFile: TsFile) {}

  /**
   * Builds and returns the JSDoc for classes and interfaces.
   *
   * @public
   * @async
   * @param {(ClassDeclaration | InterfaceDeclaration)} node
   * @returns {Promise<SnippetString>} promise that resolves with the JSDoc.
   */
  public async getClassLikeDeclarationJsdoc(node: ClassDeclaration | InterfaceDeclaration): Promise<SnippetString> {
    await this.buildJsdocHeader(node.getFullText());
    this.buildJsdocModifiers(node.modifiers);
    if (node.name) {
      this.buildJsdocLine(node.kind === SyntaxKind.InterfaceDeclaration ? 'interface' : 'class', this.includeTypes ? node.name.getText() : '', '');
      if (getConfig('includeTypes', true)) {
        this.buildJsdocLine('typedef', node.name.getText());
      }
    } else {
      this.buildJsdocLine(node.kind === SyntaxKind.InterfaceDeclaration ? 'interface' : 'class');
    }
    this.buildTypeParameters(node.typeParameters);
    this.buildJsdocHeritage(node.heritageClauses);
    this.buildCustomTags();
    this.buildJsdocEnd();
    return this.jsdoc;
  }

  /**
   * Builds and returns the JSDoc for property declarations.
   *
   * @public
   * @async
   * @param {(PropertyDeclaration | VariableDeclaration)} node
   * @returns {Promise<SnippetString>} promise that resolves with the JSDoc.
   */
  public async getPropertyDeclarationJsdoc(node: PropertyDeclaration | VariableDeclaration): Promise<SnippetString> {
    const functionAssigned = node.getChildren().find(child => this.isFunctionKind(child.kind));
    const classAssigned = node.getChildren().find(child => child.kind === SyntaxKind.ClassExpression);
    if (getConfig('functionVariablesAsFunctions', true) && functionAssigned) {
      this.getMethodDeclarationJsdoc(functionAssigned as MethodDeclaration);
    } else if (classAssigned) {
      this.getClassLikeDeclarationJsdoc(classAssigned as ClassDeclaration);
    } else {
      await this.buildJsdocHeader(node.getFullText());
      this.buildJsdocModifiers('modifiers' in node ? node.modifiers : undefined);
      if (this.includeTypes) {
        this.buildJsdocLine('type', this.retrieveType(node));
      }
      this.buildCustomTags();
      this.buildJsdocEnd();
    }
    return this.jsdoc;
  }

  /**
   * Builds and returns the JSDoc for accessor declarations.
   *
   * @public
   * @async
   * @param {AccessorDeclaration} node
   * @returns {Promise<SnippetString>} promise that resolves with the JSDoc.
   */
  public async getAccessorDeclarationJsdoc(node: AccessorDeclaration): Promise<SnippetString> {
    const otherAccessorKind = node.kind === SyntaxKind.GetAccessor ? SyntaxKind.SetAccessor : SyntaxKind.GetAccessor;
    const accessorName = node.name.getText();
    const pairedAccessor = (node.parent as ClassLikeDeclaration).members.find(member =>
      member.kind === otherAccessorKind && member.name && member.name.getText() === accessorName) as AccessorDeclaration;
    if (pairedAccessor && this.tsFile.hasJsdoc(pairedAccessor)) {
      this.jsdoc.appendText('/**\n');
      const pairedDescription = getTextOfJSDocComment(this.tsFile.getJsdoc(pairedAccessor).comment);
      await this.buildDescription(pairedDescription ? pairedDescription : '');
    } else {
      await this.buildJsdocHeader(node.getFullText());
      this.buildJsdocModifiers(node.modifiers);
      if (node.kind === SyntaxKind.GetAccessor && !pairedAccessor) {
        this.buildJsdocLine('readonly');
      }
      if (this.includeTypes) {
        this.buildJsdocLine('type', this.retrieveType(node));
      }
    }
    this.buildCustomTags();
    this.buildJsdocEnd();
    return this.jsdoc;
  }

  /**
   * Builds and returns the JSDoc for enum declarations.
   *
   * @public
   * @async
   * @param {EnumDeclaration} node
   * @returns {Promise<SnippetString>} promise that resolves with the JSDoc.
   */
  public async getEnumDeclarationJsdoc(node: EnumDeclaration): Promise<SnippetString> {
    await this.buildJsdocHeader(node.getFullText());
    this.buildJsdocModifiers(node.modifiers);
    this.buildJsdocLine('enum', this.includeTypes ? 'number' : '');
    this.buildCustomTags();
    this.buildJsdocEnd();
    return this.jsdoc;
  }

  /**
   * Builds and returns the JSDoc for method declarations.
   *
   * @public
   * @async
   * @param {MethodDeclaration} node
   * @returns {SnippetString} promise that resolves with the JSDoc for method declaration.
   */
  public async getMethodDeclarationJsdoc(node: MethodDeclaration): Promise<SnippetString> {
    await this.buildJsdocHeader(node.getFullText());
    this.buildJsdocModifiers(node.modifiers);
    this.buildTypeParameters(node.typeParameters);
    this.buildJsdocParameters(node.parameters);
    this.buildJsdocReturn(node);
    this.buildCustomTags();
    this.buildJsdocEnd();
    return this.jsdoc;
  }

  /**
   * Builds and returns the JSDoc for constructor declarations.
   *
   * @public
   * @async
   * @param {ConstructorDeclaration} node
   * @returns {SnippetString} promise that resolves with the JSDoc for constructor declaration.
   */
  public async getConstructorJsdoc(node: ConstructorDeclaration): Promise<SnippetString> {
    this.jsdoc.appendText('/**\n');
    const constructorDescription = getConfig('descriptionForConstructors', '');
    const className = node.parent.name;
    if (constructorDescription && className) {
      await this.buildDescription(constructorDescription.replace('{Object}', className.getText()));
    }
    this.buildDate();
    this.buildAuthor();
    this.buildJsdocLine();
    this.buildJsdocLine('constructor');
    this.buildJsdocModifiers(node.modifiers);
    this.buildJsdocParameters(node.parameters);
    this.buildCustomTags();
    this.buildJsdocEnd();
    return this.jsdoc;
  }

  /**
   * Builds and returns the JSDoc for type aliases, union types and intersection types.
   *
   * @public
   * @async
   * @param {TypeAliasDeclaration} node
   * @returns {SnippetString} promise that resolves with the JSDoc for type alias.
   */
  public async getTypeAliasJsdoc(node: TypeAliasDeclaration): Promise<SnippetString> {
    await this.buildJsdocHeader(node.getFullText());
    this.buildJsdocModifiers(node.modifiers);
    if (getConfig('includeTypes', true)) {
      this.buildJsdocLine('typedef', node.name.getText());
    }
    this.buildTypeParameters(node.typeParameters);
    this.buildCustomTags();
    this.buildJsdocEnd();
    return this.jsdoc;
  }

  /**
   * Builds a new JSDoc line for each modifier.
   *
   * @private
   * @param {?ModifiersArray} [modifiers]
   */
  private buildJsdocModifiers(modifiers?: NodeArray<ModifierLike>) {
    if (modifiers && modifiers.length > 0) {
      modifiers.forEach(modifier => {
        switch (modifier.kind) {
          case SyntaxKind.ExportKeyword:
            if (getConfig('includeExport', true)) {
              this.buildJsdocLine('export');
            }
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
            if (getConfig('includeAsync', true)) {
              this.buildJsdocLine('async');
            }
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
   * Builds a new JSDoc line for each type parameter.
   *
   * @private
   * @param {?NodeArray<TypeParameterDeclaration>} [typeParameters]
   */
  private buildTypeParameters(typeParameters?: NodeArray<TypeParameterDeclaration>) {
    if (typeParameters) {
      const mappedTypeParameters = typeParameters.map(typeParameter => {
        let name = typeParameter.name.getText();
        const type = this.includeTypes ? (typeParameter.constraint?.getText() ?? '') : '';
        if (typeParameter.default) {
          name = `[${name}=${typeParameter.default.getText()}]`;
        }
        return {
          type,
          name
        };
      });
      this.buildJsdocLines('template', mappedTypeParameters.map(param => param.type), '{}', mappedTypeParameters.map(param => param.name));
    }
  }

  /**
   * Builds a new JSDoc line for all heritage clauses.
   *
   * @private
   * @param {?NodeArray<HeritageClause>} [heritageClauses]
   */
  private buildJsdocHeritage(heritageClauses?: NodeArray<HeritageClause>) {
    if (heritageClauses) {
      heritageClauses.forEach(heritageClause => {
        switch (heritageClause.token) {
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
   * Builds a new JSDoc line for each parameter.
   *
   * @private
   * @param {NodeArray<ParameterDeclaration>} parameters
   */
  private buildJsdocParameters(parameters: NodeArray<ParameterDeclaration>) {
    const mappedParameters = parameters.map(parameter => {
      let name = parameter.name.getText();
      const type = this.retrieveType(parameter);
      const initializer = parameter.initializer ? (`=${parameter.initializer.getText()}`) : '';
      if (parameter.questionToken || initializer) {
        name = `[${name}${initializer}]`;
      }
      return {
        type,
        name
      };
    });
    this.buildJsdocLines('param', mappedParameters.map(param => param.type), '{}', mappedParameters.map(param => param.name));
  }

  /**
   * Builds the return value, if present, for the given method.
   *
   * @private
   * @param {MethodDeclaration} node
   */
  private buildJsdocReturn(node: MethodDeclaration) {
    let returnType;
    if (node.type) {
      returnType = node.type.getText();
    } else {
      const functionType = this.inferType(node);
      returnType = functionType.substring(functionType.split('=> ')[0].length + 3);
    }
    if (returnType === 'any') {
      returnType = '*';
    }
    if (returnType !== 'void') {
      if (this.checkParenthesisUse(returnType)) {
        returnType = `(${returnType})`;
      }
      this.buildJsdocLine('returns', this.includeTypes ? returnType : '');
    }
  }

  /**
   * Builds a JSDoc header including the starting line.
   *
   * @private
   * @async
   * @param {string} nodeText
   */
  private async buildJsdocHeader(nodeText: string) {
    this.jsdoc.appendText('/**\n');
    await this.buildDescription(nodeText);
    this.buildDate();
    this.buildAuthor();
    this.buildJsdocLine();
  }

  /**
   * Builds a line starting with a space and a configurable placeholder for a JSDoc description.
   * 
   * @private
   * @async
   * @param {string} nodeText
   * @param {string} [description='']
   */
  private async buildDescription(nodeText: string, description: string = '') {
    this.jsdoc.appendText(' * ');
    const placeholder = getConfig('descriptionPlaceholder', '');
    if (description) {
      this.jsdoc.appendText(description);
    } else if (placeholder) {
      this.jsdoc.appendPlaceholder(placeholder);
    } else if (GenerativeAPI.tryInit()) {
      const message = 'Provide a short description of this function that I will later insert into a JSDoc.\n' +
      'Very important: only text, no \'*\', no function name, and no word "function".\n' +
      `${nodeText.trim()}`;
      const autoDescription = await GenerativeAPI.chat(message);
      if (autoDescription) {
        this.jsdoc.appendText(autoDescription);
      }
    }
    this.jsdoc.appendText('\n');
  }

  /**
   * If configured to do so, builds a line with the author tag and configured value.
   *
   * @private
   */
  private buildAuthor() {
    const author = getConfig('author', '');
    if (author) {
      if (author === 'author') {
        this.jsdoc.appendText(' * @author ');
        this.jsdoc.appendPlaceholder(author);
        this.jsdoc.appendText('\n');
      } else {
        this.buildJsdocLine('author', author, '');
      }
    }
  }

  /**
   * If configured to do so, builds a line with the date tag and configured value.
   *
   * @private
   */
  private buildDate() {
    if (getConfig('includeDate', false)) {
      const date = new Date();
      let tagValue = date.toLocaleDateString();
      if (getConfig('includeTime', true)) {
        tagValue += ` - ${date.toLocaleTimeString()}`;
      }
      this.buildJsdocLine('date', tagValue, '');
    }
  }

  /**
   * Builds custom tags.
   *
   * @private
   */
  private buildCustomTags() {
    const customTags = getConfig('customTags', []);
    for (const customTag of customTags) {
      const {tag, placeholder = ''} = customTag;
      if (tag) {
        this.buildJsdocLine(`${tag}`, `${placeholder}`, '');
      }
    }
  }

  /**
   * Builds the ending line of a JSDoc.
   *
   * @private
   */
  private buildJsdocEnd() {
    if (this.jsdoc.value.endsWith('\n *\n') && (this.jsdoc.value.match(/\n/g) || []).length > 2) {
      this.jsdoc.value = this.jsdoc.value.slice(0, -3);
    }
    if (this.jsdoc.value.startsWith('/**\n *\n') && (this.jsdoc.value.match(/\n/g) || []).length > 2) {
      this.jsdoc.value = this.jsdoc.value.substring(0, 4) + this.jsdoc.value.substring(7);
    }
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
   * @param {string} [tag=''] the JSDoc tag to insert.
   * @param {string[]} [tagValues=['']] the JSDoc tag values to insert.
   * @param {string} [wrapper='{}'] a string used to wrap the tagValue. Should be of even elements and symmetrical.
   * @param {string[]} [extraValues=[]] extra values for each tag line.
   */
  private buildJsdocLines(tag: string = '', tagValues: string[] = [''], wrapper: string = '{}', extraValues: string[] = []) {
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
   * @param {string} [tag=''] the JSDoc tag to insert.
   * @param {string} [tagValue=''] the JSDoc tag value to insert.
   * @param {string} [wrapper='{}'] a string used to wrap the tagValue. Should be of even elements and symmetrical.
   * @param {string} [extraValue=''] an extra value to add to the line.
   */
  private buildJsdocLine(tag: string = '', tagValue: string = '', wrapper: string = '{}', extraValue: string = '') {
    let open = '', close = '', line = '';
    if (wrapper) {
      const middle = wrapper.length / 2;
      open = wrapper.substring(0, middle);
      close = wrapper.substring(middle);
    }
    if (tag) {
      line += ` @${tag}`;
      if (tagValue) {
        line += ` ${open}${tagValue}${close}`;
      }
      if (extraValue) {
        line += ` ${extraValue}`;
      }
    }
    this.jsdoc.appendText(` *${line}\n`);
    if (tagValue && wrapper === '{}') {
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
    return types.map(type => type.expression.getText() + this.getTypeArguments(type.typeArguments));
  }

  /**
   * If any, returns all the type arguments formatted for JSDoc, otherwise returns ''.
   *
   * @private
   * @param {?NodeArray<TypeNode>} [typeArguments]
   * @returns {string}
   */
  private getTypeArguments(typeArguments?: NodeArray<TypeNode>): string {
    return typeArguments ? `<${typeArguments.map(typeArgument => typeArgument.getText()).join(', ')}>` : '';
  }

  /**
   * Retrieves a string representing the type of the given node.
   * Returns '' if {@link JsdocBuilder.includeTypes} is false.
   *
   * @private
   * @param {TypedNode} node
   * @returns {string} string representing the node type.
   */
  private retrieveType(node: TypedNode): string {
    if (this.includeTypes) {
      let type;
      const prefix = this.getTypePrefix(node);
      if (!node.type) {
        type = this.inferType(node);
      } else if (node.type.getText() === 'any') {
        type = '*';
      } else {
        type = node.type.getText();
      }
      if (this.checkParenthesisUse(type, prefix)) {
        type = `(${type})`;
      }
      return prefix + type;
    }
    return '';
  }

  /**
   * Check if the type of the node has a modifier and returns it.
   *
   * @private
   * @param {TypedNode} node
   * @returns {string} type modifier [?, !, ..., *], empty if none.
   */
  private getTypePrefix(node: TypedNode): '?' | '!' | '...' | '*' | '' {
    if (node.kind !== SyntaxKind.VariableDeclaration && node.questionToken) {
      return '?';
    }
    if (node.kind !== SyntaxKind.Parameter && node.exclamationToken) {
      return '!';
    }
    if (node.kind === SyntaxKind.Parameter && node.dotDotDotToken) {
      return '...';
    }
    if (
      node.kind !== SyntaxKind.PropertyDeclaration &&
      node.kind !== SyntaxKind.Parameter &&
      node.kind !== SyntaxKind.VariableDeclaration &&
      node.asteriskToken
    ) {
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
   * @param {string} type
   * @param {string} [prefix='']
   * @returns {boolean}
   */
  private checkParenthesisUse(type: string, prefix: string = ''): boolean {
    return (/^[^(<]+([^(<]|[(<].*[)>])*(&|\|).*$/.test(type)) && (getConfig('includeParenthesisForMultipleTypes', true) || prefix !== '');
  }

  /**
   * Checks whether the given kind represents a function node kind.
   *
   * @private
   * @param {SyntaxKind} kind
   * @returns {boolean}
   */
  private isFunctionKind(kind: SyntaxKind): boolean {
    return (
      kind === SyntaxKind.ArrowFunction ||
      kind === SyntaxKind.MethodSignature ||
      kind === SyntaxKind.MethodDeclaration ||
      kind === SyntaxKind.CallSignature ||
      kind === SyntaxKind.FunctionExpression ||
      kind === SyntaxKind.FunctionDeclaration
    );
  }
}
