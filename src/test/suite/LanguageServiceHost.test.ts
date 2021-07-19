import * as assert from 'assert';
import {CompilerOptions, createSourceFile, getDefaultLibFilePath, ScriptSnapshot, ScriptTarget} from 'typescript';

import {LanguageServiceHost} from '../../LanguageServiceHost';

suite('LanguageServiceHost Test Suite', () => {
  test('Constructor Test', () => {
    const languageServiceHost = new LanguageServiceHost();
    assert.deepStrictEqual(languageServiceHost.getScriptFileNames(), []);
  });

  test('fileExists() Test', () => {
    const languageServiceHost = new LanguageServiceHost();
    assert.deepStrictEqual(languageServiceHost.fileExists('fileName'), false);
    languageServiceHost.updateFile('fileName', 'fileText');
    assert.deepStrictEqual(languageServiceHost.fileExists('fileName'), true);
  });

  test('readFile() Test', () => {
    const languageServiceHost = new LanguageServiceHost();
    assert.deepStrictEqual(languageServiceHost.readFile('fileName'), undefined);
    languageServiceHost.updateFile('fileName', 'fileText');
    assert.deepStrictEqual(languageServiceHost.readFile('fileName'), 'fileText');
  });

  test('updateFile() Test', () => {
    const languageServiceHost = new LanguageServiceHost();
    languageServiceHost.updateFile('fileName', 'fileText');
    assert.deepStrictEqual(languageServiceHost.readFile('fileName'), 'fileText');
    assert.deepStrictEqual(languageServiceHost.getScriptVersion('fileName'), '0');
    languageServiceHost.updateFile('fileName', 'fileText2');
    assert.deepStrictEqual(languageServiceHost.readFile('fileName'), 'fileText2');
    assert.deepStrictEqual(languageServiceHost.getScriptVersion('fileName'), '1');
  });

  test('removeFile() Test', () => {
    const languageServiceHost = new LanguageServiceHost();
    languageServiceHost.updateFile('fileName', 'fileText');
    languageServiceHost.removeFile('fileName');
    assert.deepStrictEqual(languageServiceHost.fileExists('fileName'), false);
  });

  test('getScriptFileNames() Test', () => {
    const languageServiceHost = new LanguageServiceHost();
    assert.deepStrictEqual(languageServiceHost.getScriptFileNames(), []);
    languageServiceHost.updateFile('fileName', 'fileText');
    assert.deepStrictEqual(languageServiceHost.getScriptFileNames(), ['fileName']);
  });

  test('getScriptVersion() Test', () => {
    const languageServiceHost = new LanguageServiceHost();
    assert.deepStrictEqual(languageServiceHost.getScriptVersion('fileName'), NaN.toString());
    languageServiceHost.updateFile('fileName', 'fileText');
    assert.deepStrictEqual(languageServiceHost.getScriptVersion('fileName'), '0');
    languageServiceHost.updateFile('fileName', 'fileText2');
    assert.deepStrictEqual(languageServiceHost.getScriptVersion('fileName'), '1');
  });

  test('getScriptSnapshot() Test', () => {
    const languageServiceHost = new LanguageServiceHost();
    assert.deepStrictEqual(languageServiceHost.getScriptSnapshot('fileName'), undefined);
    languageServiceHost.updateFile('fileName', 'fileText');
    assert.deepStrictEqual(languageServiceHost.getScriptSnapshot('fileName'), ScriptSnapshot.fromString('fileText'));
  });

  test('getSourceFile() Test', () => {
    const languageServiceHost = new LanguageServiceHost();
    assert.deepStrictEqual(languageServiceHost.getSourceFile('fileName'), null);
    languageServiceHost.updateFile('fileName', 'fileText');
    assert.deepStrictEqual(
      languageServiceHost.getSourceFile('fileName'),
      createSourceFile('fileName', 'fileText', ScriptTarget.Latest)
    );
  });

  test('getCurrentDirectory() Test', () => {
    const languageServiceHost = new LanguageServiceHost();
    assert.deepStrictEqual(languageServiceHost.getCurrentDirectory(), process.cwd());
  });

  test('getCompilationSettings() Test', () => {
    const languageServiceHost = new LanguageServiceHost();
    assert.deepStrictEqual(languageServiceHost.getCompilationSettings(), {allowJs: true});
  });

  test('getDefaultLibFileName() Test', () => {
    const languageServiceHost = new LanguageServiceHost();
    const options: CompilerOptions = {allowJs: true};
    assert.deepStrictEqual(languageServiceHost.getDefaultLibFileName(options), getDefaultLibFilePath(options));
  });
});
