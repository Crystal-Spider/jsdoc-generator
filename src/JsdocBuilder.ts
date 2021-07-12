import {LineAndCharacter, Node, SyntaxKind} from 'typescript';
import * as ts from 'typescript';
import {SnippetString} from 'vscode';

export class JsdocBuilder {
  private readonly jsdoc = new SnippetString();

  public getClassDeclarationJsdoc(node: ts.ClassDeclaration, location: LineAndCharacter): SnippetString {
  	this.buildJsdocHeader();
  	this.buildModifier(node);
  	this.buildJsdocLine('class');
  	if(node.name) {
  		this.buildJsdocLine('typedef', node.name.getText());
  	}
  	this.buildJsdocHeritage(node);
  	this.buildJsdocEnd();
  	return this.jsdoc;
  }

  private buildJsdocHeader() {
  	this.jsdoc.appendText('/**\n');
  	this.buildDescription();
  	this.buildAuthor();
  	this.buildDate();
  	this.buildJsdocLine();
  }

  private buildDescription() {
  	this.jsdoc.appendText(' * \n');
  }

  private buildAuthor() {
  	// TODO: add check for author.
  	const author = 'TODO';
  	this.buildJsdocLine('author', author);
  }

  private buildDate() {
  	// TODO: add check for date.
  	const date = new Date();
  	this.buildJsdocLine('date', date.toLocaleDateString() + ' - ' + date.toLocaleTimeString());
  }

  private buildModifier(node: Node) {
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

  private buildJsdocHeritage(node: ts.ClassLikeDeclaration | ts.InterfaceDeclaration) {
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

  private getMultipleTypes(types: ts.NodeArray<ts.ExpressionWithTypeArguments>) {
    return types.map((type) => type.expression.getText() + this.getTypeArguments(type.typeArguments));
  }

  private getTypeArguments(typeArguments: ts.NodeArray<ts.TypeNode> | undefined) {
    return typeArguments ? '<' + typeArguments.map((typeArgument) => typeArgument.getText()).join(', ') + '>' : '';
  }

  private buildJsdocLines(tag: string = '', tagValues: string[] = []) {
    tagValues.forEach((tagValue) => {
      this.buildJsdocLine(tag, tagValue);
    });
  }

  private buildJsdocLine(tag: string = '', tagValue: string = '') {
  	this.jsdoc.appendText(' *' + (!!tag ? ` @${tag}` : '') + (!!tagValue ? ` {${tagValue}}` : '') + '\n');
  	if(!!tagValue) {
  		// Remove '\' that comes from .appendText() escaping '}'.
  		const backslashIndex = this.jsdoc.value.indexOf('\\');
  		this.jsdoc.value = this.jsdoc.value.substring(0, backslashIndex) + this.jsdoc.value.substring(backslashIndex + 1);
  	}
  }

  private buildJsdocEnd() {
  	this.jsdoc.appendText(' */');
  }

  public get emptyJsdoc() {
  	return this.jsdoc;
  }
}
