import moment from 'moment';
import {getTextOfJSDocComment, Node, SyntaxKind, NodeArray, TypeNode, ExpressionWithTypeArguments, TypeParameterDeclaration, HeritageClause, AccessorDeclaration, ClassDeclaration, ClassLikeDeclaration, ConstructorDeclaration, EnumDeclaration, InterfaceDeclaration, MethodDeclaration, ParameterDeclaration, PropertyDeclaration, TypeAliasDeclaration, VariableDeclaration, ModifierLike, BindingPattern} from 'typescript';
import {SnippetString} from 'vscode';

import {getConfig, SummarizedParameter} from './extension';
import {GenerativeAPI, NodeType} from './GenerativeAPI';
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
 * Possible wrappers for types.
 *
 * @typedef {Wrapper}
 */
type Wrapper = '' | '{}';

/**
 * JSDoc line data.
 *
 * @interface JSDocLine
 * @typedef {JSDocLine}
 */
interface JSDocLine {
  /**
   * Tag value.
   *
   * @type {?string}
   */
  value?: string;
  /**
   * Tag value wrapper.
   *
   * @type {?Wrapper}
   */
  wrapper?: Wrapper;
  /**
   * Tag name value.
   *
   * @type {?string}
   */
  name?: string;
  /**
   * Tag description.
   *
   * @type {?string}
   */
  description?: string;
  /**
   * Whether to align the tag columns.
   *
   * @type {?boolean}
   */
  align?: boolean;
  /**
   * Whether to force the value to be a placeholder.
   *
   * @type {?boolean}
   */
  placeholder?: boolean;
}

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
   * Snippet string with an empty JSDoc.
   *
   * @public
   * @async
   * @returns {Promise<SnippetString>}
   */
  public async emptyJsdoc(): Promise<SnippetString> {
    await this.buildJsdocHeader();
    this.buildJsdocEnd();
    return this.jsdoc;
  }

  /**
   * Creates a file-level JSDoc.
   *
   * @public
   * @async
   * @returns {Promise<SnippetString>}
   */
  public async fileJsdoc(): Promise<SnippetString> {
    this.jsdoc.appendText('/**\n');
    this.buildJsdocLine('file', {description: ''});
    this.buildDate();
    this.buildAuthor();
    this.buildCustomTags('file');
    this.buildJsdocEnd();
    return this.jsdoc;
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
    const nodeType: NodeType = node.kind === SyntaxKind.InterfaceDeclaration ? 'interface' : 'class';
    await this.buildJsdocHeader(node.getFullText(), nodeType);
    this.buildJsdocModifiers(node.modifiers);
    if (node.name) {
      this.buildJsdocLine(nodeType, {value: this.includeTypes ? node.name.getText() : '', wrapper: ''});
      if (getConfig('includeTypes', true)) {
        this.buildJsdocLine('typedef', {value: node.name.getText()});
      }
    } else {
      this.buildJsdocLine(nodeType);
    }
    await this.buildTypeParameters(node.getFullText(), nodeType, node.typeParameters);
    this.buildJsdocHeritage(node.heritageClauses);
    this.buildCustomTags(nodeType);
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
      await this.getMethodDeclarationJsdoc(functionAssigned as MethodDeclaration);
    } else if (classAssigned) {
      await this.getClassLikeDeclarationJsdoc(classAssigned as ClassDeclaration);
    } else {
      const modifiers = 'modifiers' in node ? node.modifiers : undefined;
      await this.buildJsdocHeader(node.getFullText(), 'property', this.checkOverride(modifiers));
      this.buildJsdocModifiers(modifiers);
      if (this.includeTypes) {
        this.buildJsdocLine('type', {value: this.retrieveType(node)});
      }
      this.buildCustomTags('property');
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
    const pairedAccessor = (node.parent as ClassLikeDeclaration).members.find(member => member.kind === otherAccessorKind && member.name?.getText() === accessorName) as AccessorDeclaration;
    if (pairedAccessor && this.tsFile.hasJsdoc(pairedAccessor)) {
      this.jsdoc.appendText('/**\n');
      await this.buildDescription(node.getFullText(), getTextOfJSDocComment(this.tsFile.getJsdoc(pairedAccessor).comment) ?? '');
    } else {
      const override = this.checkOverride(node.modifiers);
      await this.buildJsdocHeader(node.getFullText(), 'property', override);
      this.buildJsdocModifiers(node.modifiers);
      if (node.kind === SyntaxKind.GetAccessor && !pairedAccessor) {
        this.buildJsdocLine('readonly');
      }
      if (this.includeTypes) {
        this.buildJsdocLine('type', {value: this.retrieveType(node)});
      }
    }
    this.buildCustomTags('accessor');
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
    await this.buildJsdocHeader(node.getFullText(), 'enum');
    this.buildJsdocModifiers(node.modifiers);
    this.buildJsdocLine('enum', {value: this.includeTypes ? 'number' : ''});
    this.buildCustomTags('enum');
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
    const override = this.checkOverride(node.modifiers);
    await this.buildJsdocHeader(node.getFullText(), 'function', override);
    this.buildJsdocModifiers(node.modifiers);
    await this.buildTypeParameters(node.getFullText(), 'function', node.typeParameters);
    await this.buildJsdocParameters(node.getFullText(), node.parameters);
    if (getConfig('includeReturn', true)) {
      await this.buildJsdocReturn(node);
    }
    this.buildCustomTags('function');
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
      await this.buildDescription(node.getFullText(), constructorDescription.replace('{Object}', className.getText()));
    }
    this.buildDate();
    this.buildAuthor();
    if (getConfig('emptyLineAfterHeader', true)) {
      this.buildJsdocLine();
    }
    this.buildJsdocLine('constructor');
    this.buildJsdocModifiers(node.modifiers);
    await this.buildJsdocParameters(node.getFullText(), node.parameters);
    this.buildCustomTags('constructor');
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
    await this.buildJsdocHeader(node.getFullText(), 'type');
    this.buildJsdocModifiers(node.modifiers);
    if (getConfig('includeTypes', true)) {
      this.buildJsdocLine('typedef', {value: node.name.getText()});
    }
    await this.buildTypeParameters(node.getFullText(), 'type', node.typeParameters);
    this.buildCustomTags('type');
    this.buildJsdocEnd();
    return this.jsdoc;
  }

  /**
   * Builds a new JSDoc line for each type parameter.
   *
   * @private
   * @async
   * @param {string} nodeText
   * @param {NodeType} nodeType
   * @param {?NodeArray<TypeParameterDeclaration>} [typeParameters]
   */
  private async buildTypeParameters(nodeText: string, nodeType: NodeType, typeParameters?: NodeArray<TypeParameterDeclaration>) {
    if (typeParameters) {
      const mappedTypeParameters: SummarizedParameter[] = typeParameters.map(typeParameter => {
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
      this.buildJsdocLines('template', mappedTypeParameters.map(param => param.type), '{}', mappedTypeParameters.map(param => param.name), await GenerativeAPI.describeParameters(nodeText, nodeType, true, mappedTypeParameters));
    }
  }

  /**
   * Builds a new JSDoc line for each parameter.
   *
   * @private
   * @async
   * @param {string} nodeText
   * @param {NodeArray<ParameterDeclaration>} parameters
   */
  private async buildJsdocParameters(nodeText: string, parameters: NodeArray<ParameterDeclaration>) {
    let bindingPatterns = 0;
    const mappedParameters: SummarizedParameter[] = parameters.map(parameter => {
      const bindingElements: SummarizedParameter[] = [];
      let name = parameter.name.getText();
      const type = this.retrieveType(parameter);
      const initializer = parameter.initializer ? (`=${parameter.initializer.getText()}`) : '';
      if ([SyntaxKind.ObjectBindingPattern, SyntaxKind.ArrayBindingPattern].includes(parameter.name.kind)) {
        name = `param${bindingPatterns++}`;
        (parameter.name as BindingPattern).elements.forEach(element => {
          if (element.kind !== SyntaxKind.OmittedExpression) {
            bindingElements.push({
              type: this.retrieveType(element),
              name: `${element.initializer ? '[' : ''}${name}.${element.getText()}${element.initializer ? ']' : ''}`.replace(' = ', '=')
            });
          }
        });
      }
      if (parameter.questionToken || initializer) {
        name = `[${name}${initializer}]`;
      }
      return bindingElements.length ? [{type, name}, ...bindingElements] : {type, name};
    }).flat();
    this.buildJsdocLines('param', mappedParameters.map(param => param.type), '{}', mappedParameters.map(param => param.name), await GenerativeAPI.describeParameters(nodeText, 'function', false, mappedParameters));
  }

  /**
   * Builds the return value, if present, for the given method.
   *
   * @private
   * @async
   * @param {MethodDeclaration} node
   */
  private async buildJsdocReturn(node: MethodDeclaration) {
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
      this.buildJsdocLine('returns', {value: this.includeTypes ? returnType : '', description: await GenerativeAPI.describeReturn(node.getFullText())});
    }
  }

  /**
   * Builds a new JSDoc line for each modifier.
   *
   * @private
   * @param {?NodeArray<ModifierLike>} [modifiers]
   * @param {boolean} [override=false]
   */
  private buildJsdocModifiers(modifiers?: NodeArray<ModifierLike>, override: boolean = false) {
    if (modifiers && modifiers.length > 0) {
      if (override) {
        this.buildJsdocLine('override');
      } else {
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
            default: break;
          }
        });
      }
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
   * Builds a JSDoc header including the starting line.
   *
   * @private
   * @async
   * @param {?string} [nodeText]
   * @param {?NodeType} [type]
   * @param {boolean} [override=false]
   */
  private async buildJsdocHeader(nodeText?: string, type?: NodeType, override: boolean = false) {
    this.jsdoc.appendText('/**\n');
    if (override) {
      this.buildJsdocLine('inheritdoc');
    } else {
      await this.buildDescription(nodeText, '', type);
    }
    this.buildDate();
    this.buildAuthor();
    if (getConfig('emptyLineAfterHeader', true)) {
      this.buildJsdocLine();
    }
  }

  /**
   * Builds a line starting with a space and a configurable placeholder for a JSDoc description.
   * 
   * @private
   * @async
   * @param {?string} nodeText
   * @param {?string} description
   * @param {?NodeType} type
   */
  private async buildDescription(nodeText?: string, description?: string, type?: NodeType) {
    const placeholder = getConfig('descriptionPlaceholder', '');
    if (description) {
      this.jsdoc.appendText(` * ${this.sanitize(description)}\n`);
    } else {
      this.jsdoc.appendText(' * ');
      this.jsdoc.appendPlaceholder(this.sanitize((nodeText && type && await GenerativeAPI.describeSnippet(nodeText, type)) || placeholder));
      this.jsdoc.appendText('\n');
    }
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
        this.buildJsdocLine('author', {value: author, wrapper: '', align: false});
      }
    }
  }

  /**
   * If configured to do so, builds a line with the date tag and configured value.
   *
   * @private
   */
  private buildDate() {
    const format = getConfig('dateFormat', '');
    if (format) {
      this.buildJsdocLine('date', {value: moment().format(format), wrapper: '', align: false});
    }
  }

  /**
   * Builds custom tags.
   *
   * @param {NodeType} nodeType node type to which the custom tags would be added.
   * @private
   */
  private buildCustomTags(nodeType: NodeType) {
    const customTags = getConfig('customTags', []);
    for (const customTag of customTags) {
      const {tag, placeholder = '', whitelist = []} = customTag;
      if (whitelist.length === 0 || whitelist.includes(nodeType)) {
        this.buildJsdocLine(tag, {value: placeholder, wrapper: '', placeholder: true});
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
    if (getConfig('singleLineComments', false)) {
      this.jsdoc.value = this.jsdoc.value.replace(/^\/\*\*\n \* ?(.*)\n$/, '/** $1');
    }
    this.jsdoc.appendText(' */\n');
  }

  /**
   * Builds multiple lines for a JSDoc.
   * When using all the default values, an empty JSDoc line is built.
   * It is possible to create several empty JSDoc lines by setting values as an array with several empty strings.
   * The same `tag` and `wrapper` will be used for all values in separate lines.
   * `values` and `names` are used in order as found in the array.
   *
   * @private
   * @param {string} [tag=''] the JSDoc tag to insert.
   * @param {string[]} [values=['']] the JSDoc tag values to insert.
   * @param {string} [wrapper='{}'] a string used to wrap the tag value. Should be of even elements and symmetrical.
   * @param {string[]} [names=[]] name values for each tag line.
   * @param {string[]} [descriptions=[]] description values for each tag line.
   */
  private buildJsdocLines(tag: string = '', values: string[] = [''], wrapper: Wrapper = '{}', names: string[] = [], descriptions: string[] = []) {
    values.forEach((value, index) => this.buildJsdocLine(tag, {value, wrapper, name: names[index], description: descriptions[index]}));
  }

  /**
   * Builds a single line for a JSDoc.
   * When using all the default values, an empty JSDoc line is built.
   * When setting wrapper to '', the value is not wrapped.
   *
   * @private
   * @param {string} [tag=''] the JSDoc tag to insert.
   * @param {JSDocLine} [line={}] data for the JSDoc line.
   * @param {string} [line.value=''] the JSDoc tag value to insert.
   * @param {string} [line.wrapper='{}'] a string used to wrap the value. Should be of even elements and symmetrical.
   * @param {string} [line.name=''] an extra value to add to the line.
   * @param {string} [line.description=''] description value to add to the line.
   * @param {boolean} [line.align=true] whether to align `tag`, `value`, `name`, and `description`.
   * @param {boolean} [line.placeholder=true] whether to force `value` to be a placeholder.
   */
  private buildJsdocLine(tag = '', {value = '', wrapper = '{}', name = '', description = '', align = true, placeholder = false}: JSDocLine = {}) {
    let open = '', close = '';
    if (wrapper) {
      const middle = wrapper.length / 2;
      open = wrapper.substring(0, middle);
      close = wrapper.substring(middle);
    }
    this.jsdoc.appendText(' *');
    if (tag) {
      let line = ` @${tag}`, offset = 0;
      if (value === '*' || placeholder) {
        // Add line with alignment and `${open}${value}${close}` until open wrapper, then add value as placeholder.
        line = `${line.padEnd(+align && getConfig('tagValueColumnStart', 0))} ${this.sanitize(open)}`;
        this.jsdoc.appendText(this.sanitize(line));
        this.jsdoc.appendPlaceholder(value);
        // Reset, add close wrapper, and continue with offset.
        offset = line.length;
        line = close;
      } else if (value) {
        line = `${line.padEnd(+align && getConfig('tagValueColumnStart', 0))} ${open}${value}${close}`;
      }
      if (name) {
        line = `${line.padEnd(+align && getConfig('tagNameColumnStart', 0) - offset)} ${name}`;
      }
      if (description || name || tag === 'returns' || tag === 'file') {
        // Add line until empty space, then add description as placeholder.
        line = `${line.padEnd(+align && getConfig('tagDescriptionColumnStart', 0) - offset)} `;
        this.jsdoc.appendText(this.sanitize(line));
        this.jsdoc.appendPlaceholder(description || '');
      } else {
        this.jsdoc.appendText(this.sanitize(line));
      }
    }
    this.jsdoc.appendText('\n');
    if (value && wrapper === '{}') {
      // Remove '\' that comes from .appendText() escaping '}'.
      this.jsdoc.value = this.jsdoc.value.replace(/\\}/g, '}');
    }
  }

  /**
   * Checks whether the list of modifiers includes the override keyword.
   *
   * @private
   * @param {?NodeArray<ModifierLike>} [modifiers]
   * @returns {boolean}
   */
  private checkOverride(modifiers?: NodeArray<ModifierLike>): boolean {
    return !!(modifiers && modifiers.some(modifier => modifier.kind === SyntaxKind.OverrideKeyword));
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
   * @param {(TypedNode | Node)} node
   * @returns {string} string representing the node type.
   */
  private retrieveType(node: TypedNode | Node): string {
    if (this.includeTypes) {
      let type;
      const prefix = this.getTypePrefix(node);
      if (!('type' in node) || !node.type) {
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
   * @param {(TypedNode | Node)} node
   * @returns {string} type modifier [?, !, ..., *], empty if none.
   */
  private getTypePrefix(node: TypedNode | Node): '?' | '!' | '...' | '*' | '' {
    if ('type' in node) {
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

  /**
   * Sanitizes possibly multiline values for JSDoc.
   *
   * @private
   * @param {string} value
   * @returns {string}
   */
  private sanitize(value: string): string {
    return value.replace(/\n+/g, '\n * ');
  }
}
