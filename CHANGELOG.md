# Change Log

All notable changes to the "jsdoc-generator" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

- Nothing new.

## [2.1.0] - 2024/04/12

### Changes

- Implemented [#22](https://github.com/Crystal-Spider/jsdoc-generator/issues/22), changing how date tag format is handled.  
  Replaced `includeDate` and `includeTime` options with `dateFormat`.

## [2.0.2] - 2024/02/27

### Fixes

- [#20](https://github.com/Crystal-Spider/jsdoc-generator/issues/20), missing JSDoc terminator.

## [2.0.1] - 2023/10/25

### Fixes

- [#18](https://github.com/Nyphet/jsdoc-generator/issues/18), multiline values and descriptions not adding asterisks on new lines.
- API key setting not resetting unless the extension is reloaded.

## [2.0.0] - 2023/10/12

### Additions

- Implemented [#16](https://github.com/Nyphet/jsdoc-generator/issues/16), added alignment options.
- Implemented [#10](https://github.com/Nyphet/jsdoc-generator/issues/10), integration of ChatGPT to automatically generate descriptions.
- Finally implemented the command to generate JSDoc for all suitable files in the current workspace (recursive).
- Additions command in folder contextual menu to generate JSDoc for all TS and JS files in the folder (recursive).
- Additions command in file contextual menu to generate JSDoc for that file.
- Additions progress loader to keep track of the generating JSDocs or interrupt the generation.

### Changes

- Now explicitly overridden methods will only add the `@override` and `@inheritdoc` tags.

### Fixes

- Fixed [#8](https://github.com/Nyphet/jsdoc-generator/issues/8), corrected and improved template tags.
- Fixed [#12](https://github.com/Nyphet/jsdoc-generator/issues/12), prevent adding `@typedef` when `includeTypes` is false.
- Fixed [#17](https://github.com/Nyphet/jsdoc-generator/issues/17), JSDoc generation for functions that deconstruct parameters.

## [1.3.0] - 2023/07/21

### Additions

- New setting option to create custom tags.

## [1.2.0] - 2023/02/26

### Additions

- Setting to toggle whether to include types (defaults to `true`).
- Support for JavaScript and JavaScript React.

### Changes

- Template tags now correctly only show the name of the type parameter.

### Fixes

- Fixed [#5](https://github.com/Nyphet/jsdoc-generator/issues/5).
- Fixed unnecessary brackets around union or intersection types.  
  For example, `Type<T & U>` before became `(Type<T & U>)`, now it correctly stays as `Type<T & U>`.

## [1.1.1] - 2022/04/09

### Additions

- Setting to toggle whether to include export tag
- Setting to toggle whether to include async tag

## [1.1.0] - 2021/12/03

### Additions

- Support for TypeScript React.

### Changes

- A few minor project configuration settings with consequent fixes.

## [1.0.0] - 2021/07/20

### Additions

- 3 commands declarations.
- Extension configurations.
- Bundling.
- [README] file.
- JSDoc single node generation (1st command).
- JSDoc single node generation with completion.
- JSDoc single file generation (2nd command).
- Type inference to generate more precise JSDoc.
- Few basic unit tests.
- This [CHANGELOG] file.

[unreleased]: https://github.com/Nyphet/jsdoc-generator
[2.0.2]: https://github.com/Nyphet/jsdoc-generator/releases/tag/v2.0.2
[2.0.1]: https://github.com/Nyphet/jsdoc-generator/releases/tag/v2.0.1
[2.0.0]: https://github.com/Nyphet/jsdoc-generator/releases/tag/v2.0.0
[1.3.0]: https://github.com/Nyphet/jsdoc-generator/releases/tag/v1.3.0
[1.2.0]: https://github.com/Nyphet/jsdoc-generator/releases/tag/v1.2.0
[1.1.1]: https://github.com/Nyphet/jsdoc-generator/releases/tag/v1.1.1
[1.1.0]: https://github.com/Nyphet/jsdoc-generator/releases/tag/v1.1.0
[1.0.0]: https://github.com/Nyphet/jsdoc-generator/releases/tag/v1.0.0
[readme]: https://github.com/Nyphet/jsdoc-generator
[changelog]: https://github.com/Nyphet/jsdoc-generator/blob/main/CHANGELOG.md
