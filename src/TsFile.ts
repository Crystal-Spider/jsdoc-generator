import {getPositionOfLineAndCharacter,
  JSDoc,
  Node,
  Program,
  SourceFile,
  SyntaxKind,
  TextChangeRange,
  TextSpan} from 'typescript';
import {Position} from 'vscode';

/**
 * Class representing a TypeScript File with some utility methods for JSDoc generation.
 *
 * @export
 * @class TsFile
 * @typedef {TsFile}
 */
export class TsFile {
  /**
   * TS Nodes that can have a JSDoc.
   *
   * @private
   * @readonly
   * @type {SyntaxKind[]}
   */
	private readonly supportedNodes: SyntaxKind[] = [
	  SyntaxKind.PropertySignature,
	  SyntaxKind.PropertyDeclaration,
	  SyntaxKind.MethodSignature,
	  SyntaxKind.MethodDeclaration,
	  SyntaxKind.Constructor,
	  SyntaxKind.GetAccessor,
	  SyntaxKind.SetAccessor,
	  SyntaxKind.CallSignature,
	  SyntaxKind.FunctionExpression,
	  SyntaxKind.ArrowFunction,
	  SyntaxKind.VariableStatement,
	  SyntaxKind.VariableDeclarationList,
	  SyntaxKind.FunctionDeclaration,
	  SyntaxKind.ClassDeclaration,
	  SyntaxKind.InterfaceDeclaration,
	  SyntaxKind.TypeAliasDeclaration,
	  SyntaxKind.EnumDeclaration,
	  SyntaxKind.EnumMember
	];

	/**
	 * TS Program.
	 *
	 * @type {?Program}
	 */
	program?: Program;

	/**
	 * TS sourceFile.
	 *
	 * @type {?SourceFile}
	 */
	sourceFile?: SourceFile;

	/**
	 * Caret position.
	 *
	 * @type {?Position}
	 */
	caret?: Position;

	/**
	 * @constructor
	 * @param {string} fileName
	 * @param {string} newText
	 * @param {?Position} [caret]
	 * @param {?Program} [program]
	 */
	constructor(fileName: string, newText: string, caret?: Position, program?: Program) {
	  this.caret = caret;
	  this.program = program;
	  if (program) {
	    const sourceFile = program.getSourceFile(fileName);
	    if (sourceFile) {
	      sourceFile.update(newText, <TextChangeRange>{
	        newLength: newText.length,
	        span: <TextSpan>{
	          start: 0,
	          length: newText.length
	        }
	      });
	      this.sourceFile = sourceFile;
	    }
	  } else {
	    this.sourceFile = undefined;
	  }
	}

	/**
	 * Checks whether or not the given node is supported.
	 *
	 * @param {Node} node
	 * @returns {boolean}
	 */
	public isNodeSupported(node: Node): boolean {
	  return this.supportedNodes.includes(node.kind);
	}

	/**
	 * Uses the TypeScript API to infer the node type. Returns '' when the type cannot be inferred.
	 *
	 * @param {Node} node
	 * @returns {string}
	 */
	public inferType(node: Node): string {
	  return this.program ? this.program.getTypeChecker().typeToString(this.program.getTypeChecker().getTypeAtLocation(node)) : '';
	}

	/**
	 * Checks whether the given node has a JSDoc.
	 *
	 * @param {Node} node
	 * @returns {boolean}
	 */
	public hasJsdoc(node: Node): boolean {
	  return !!(<any>node).jsDoc;
	}

	/**
	 * Retrieves the JSDoc of the given node.
	 * Could unexpectedly return undefined if not called after {@link TsFile.hasJsdoc} has returned true.
	 *
	 * @param {Node} node
	 * @returns {JSDoc}
	 */
	public getJsdoc(node: Node): JSDoc {
	  return <JSDoc>(<any>node).jsDoc[0];
	}

	/**
	 * Exposes the supported node for the current file at the current caret position.
	 *
	 * @readonly
	 * @type {(Node | undefined)}
	 */
	public get supportedNode(): Node | undefined {
	  if (this.sourceFile && this.caret) {
	    const {line} = this.caret;
	    const {character} = this.caret;
	    const position = getPositionOfLineAndCharacter(this.sourceFile, line, character);
	    const node = this.findNode(this.sourceFile, position);
	    return this.retrieveSupportedNode(node);
	  }
	  return undefined;
	}

	/**
	 * Finds the deepest node that contains the position.
	 *
	 * @private
	 * @param {Node} source initial node in which to search.
	 * @param {number} position
	 * @param {Node} [parent=source] needed for recursive calls, defaults to source.
	 * @returns {Node}
	 */
	private findNode(source: Node, position: number, parent: Node = source): Node {
	  let node: Node = parent;
	  if (source.getFullStart() <= position && source.getEnd() >= position) {
	    node = source;
	  }
	  source.forEachChild(child => { node = this.findNode(child, position, node); });
	  return node;
	}

	/**
	 * Retrieves the first (deepest) supported parent node of the node passed as parameter.
	 * If property kind of such parent node equals {@link SyntaxKind.VariableDeclarationList},
	 * also retrieves the VariableDeclaration child node from it.
	 *
	 * @private
	 * @param {Node} node
	 * @returns {(Node | undefined)}
	 */
	private retrieveSupportedNode(node: Node): Node | undefined {
	  let parent = node;
	  while (parent) {
	    if (this.isNodeSupported(parent)) {
	      return parent;
	    }
	    ({parent} = parent);
	  }
	  return undefined;
	}
}
