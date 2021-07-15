import {
  getPositionOfLineAndCharacter,
  Node,
  Program,
  SourceFile,
  SyntaxKind,
  TextChangeRange,
  TextSpan,
  VariableDeclarationList
} from 'typescript';
import ts = require('typescript');
import {Position} from 'vscode';

import {UndefTemplate} from './UndefTemplate';

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
	  SyntaxKind.VariableDeclaration,
	  SyntaxKind.VariableDeclarationList,
	  SyntaxKind.FunctionDeclaration,
	  SyntaxKind.ClassDeclaration,
	  SyntaxKind.InterfaceDeclaration,
	  SyntaxKind.EnumDeclaration,
	  SyntaxKind.EnumMember
	];

	/**
	 * TS Program.
	 *
	 * @type {UndefTemplate<Program>}
	 */
	program: UndefTemplate<Program>;

	/**
	 * TS sourceFile.
	 *
	 * @type {UndefTemplate<SourceFile>}
	 */
	sourceFile: UndefTemplate<SourceFile>;

	/**
	 * Caret position.
	 *
	 * @type {Position}
	 */
	caret: Position;

	/**
	 * @constructor
	 * @param {UndefTemplate<Program>} program
	 * @param {string} fileName
	 * @param {string} newText
	 * @param {Position} caret
	 */
	constructor(program: UndefTemplate<Program>, fileName: string, newText: string, caret: Position) {
	  this.caret = caret;
	  this.program = program;
	  if(program) {
	    const sourceFile = program.getSourceFile(fileName);
	    if(sourceFile) {
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
	 * Exposes the supported node for the current file at the current caret position.
	 *
	 * @readonly
	 * @type {UndefTemplate<Node>}
	 */
	public get supportedNode(): UndefTemplate<Node> {
	  if(this.sourceFile) {
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
	 * @param {Node} source initial node in which to search
	 * @param {number} position
	 * @param {Node} parent needed for recursive calls, defaults to source
	 * @returns {Node}
	 */
	private findNode(source: Node, position: number, parent: Node = source): Node {
	  let node: Node = parent;
	  if(source.getFullStart() <= position && source.getEnd() >= position) {
	    node = source;
	  }
	  source.forEachChild((child) => { node = this.findNode(child, position, node); });
	  return node;
	}

	/**
	 * Retrieves the first (deepest) supported parent node of the node passed as parameter.
	 * If property kind of such parent node equals {@link SyntaxKind.VariableDeclarationList},
	 * also retrieves the VariableDeclaration child node from it.
	 *
	 * @private
	 * @param {Node} node
	 * @returns {UndefTemplate<Node>}
	 */
	private retrieveSupportedNode(node: Node): UndefTemplate<Node> {
	  let parent = node;
	  while(parent) {
	    if(this.supportedNodes.includes(parent.kind)) {
	      if(parent.kind === SyntaxKind.VariableDeclarationList) {
	        return (<VariableDeclarationList> parent).declarations[0];
	      }
	      return parent;
	    }
	    ({parent} = parent);
	  }
	  return undefined;
	}

	public inferType(node: Node) {
	  if(this.program) {
	    const type = this.program.getTypeChecker().getTypeAtLocation(node);
	    return this.program.getTypeChecker().typeToString(type);
	  }
	  return '';
	}
}
