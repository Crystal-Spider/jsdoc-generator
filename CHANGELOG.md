# Change Log

All notable changes to the "jsdoc-generator" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

- Draft to support both Copilot and Gemini.

## [2.3.2] - 2025/04/07

### Fixes

- Minor dependencies vulnerabilities.

## [2.3.1] - 2025/01/09

### Fixes

- Error messages appear when JSDoc generation fails for a file.
- Fixed progress dialog when generating JSDocs for a file.
- [#30](https://github.com/Crystal-Spider/jsdoc-generator/issues/30), commands to generate JSDocs for files, folders, or workspace inserting broken placeholders.

## [2.3.0] - 2025/01/05

### Fixes

- [#29](https://github.com/Crystal-Spider/jsdoc-generator/issues/29), impossible to create file-level comments.

### Changes

- Updated many dev dependencies and related code.\nNote that jsdoc-generator.descriptionPlaceholder will take precedence.
- Option `jsdoc-generator.generativeModel` now takes precedence over `jsdoc-generator.descriptionPlaceholder`.
- Now all AI generated comments are placeholders.
- Now tags that are supposed to have a description, even when no description is generated, an empty placeholder is inserted for better keyboard navigation.
- VSCode required version is now `1.96.0`.

### Additions

- Implemented [#26](https://github.com/Crystal-Spider/jsdoc-generator/issues/26), option to toggle generation of @returns tags.
- Implemented [#27](https://github.com/Crystal-Spider/jsdoc-generator/issues/27), make any custom tag placeholder an actual placeholder.
- Added a whitelist property to custom tags to narrow which node types will have the custom tag added in their JSDoc.
- Added several new OpenAI models to choose from to generate AI descriptions.
- Slightly improved AI generated text.

## [2.2.0] - 2024/07/16

### Additions

- [#23](https://github.com/Crystal-Spider/jsdoc-generator/pull/23), new options to create single line descriptions and to omit the empty line after descriptions.
- [#24](https://github.com/Crystal-Spider/jsdoc-generator/pull/24), placeholder for unknown type annotations (`any`s).

## [2.1.0] - 2024/04/12

### Changes

- Implemented [#22](https://github.com/Crystal-Spider/jsdoc-generator/issues/22), changing how date tag format is handled.  
  Replaced `includeDate` and `includeTime` options with `dateFormat`.

## [2.0.2] - 2024/02/27

### Fixes

- [#20](https://github.com/Crystal-Spider/jsdoc-generator/issues/20), missing JSDoc terminator.

## [2.0.1] - 2023/10/25

### Fixes

- [#18](https://github.com/Crystal-Spider/jsdoc-generator/issues/18), multiline values and descriptions not adding asterisks on new lines.
- API key setting not resetting unless the extension is reloaded.

## [2.0.0] - 2023/10/12

### Additions

- Implemented [#16](https://github.com/Crystal-Spider/jsdoc-generator/issues/16), added alignment options.
- Implemented [#10](https://github.com/Crystal-Spider/jsdoc-generator/issues/10), integration of ChatGPT to automatically generate descriptions.
- Finally implemented the command to generate JSDoc for all suitable files in the current workspace (recursive).
- Additions command in folder contextual menu to generate JSDoc for all TS and JS files in the folder (recursive).
- Additions command in file contextual menu to generate JSDoc for that file.
- Additions progress loader to keep track of the generating JSDocs or interrupt the generation.

### Changes

- Now explicitly overridden methods will only add the `@override` and `@inheritdoc` tags.

### Fixes

- Fixed [#8](https://github.com/Crystal-Spider/jsdoc-generator/issues/8), corrected and improved template tags.
- Fixed [#12](https://github.com/Crystal-Spider/jsdoc-generator/issues/12), prevent adding `@typedef` when `includeTypes` is false.
- Fixed [#17](https://github.com/Crystal-Spider/jsdoc-generator/issues/17), JSDoc generation for functions that deconstruct parameters.

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

- Fixed [#5](https://github.com/Crystal-Spider/jsdoc-generator/issues/5).
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

[unreleased]: https://github.com/Crystal-Spider/jsdoc-generator
[2.3.2]: https://github.com/Crystal-Spider/jsdoc-generator/releases/tag/v2.3.2
[2.3.1]: https://github.com/Crystal-Spider/jsdoc-generator/releases/tag/v2.3.1
[2.3.0]: https://github.com/Crystal-Spider/jsdoc-generator/releases/tag/v2.3.0
[2.2.0]: https://github.com/Crystal-Spider/jsdoc-generator/releases/tag/v2.2.0
[2.1.0]: https://github.com/Crystal-Spider/jsdoc-generator/releases/tag/v2.1.0
[2.0.2]: https://github.com/Crystal-Spider/jsdoc-generator/releases/tag/v2.0.2
[2.0.1]: https://github.com/Crystal-Spider/jsdoc-generator/releases/tag/v2.0.1
[2.0.0]: https://github.com/Crystal-Spider/jsdoc-generator/releases/tag/v2.0.0
[1.3.0]: https://github.com/Crystal-Spider/jsdoc-generator/releases/tag/v1.3.0
[1.2.0]: https://github.com/Crystal-Spider/jsdoc-generator/releases/tag/v1.2.0
[1.1.1]: https://github.com/Crystal-Spider/jsdoc-generator/releases/tag/v1.1.1
[1.1.0]: https://github.com/Crystal-Spider/jsdoc-generator/releases/tag/v1.1.0
[1.0.0]: https://github.com/Crystal-Spider/jsdoc-generator/releases/tag/v1.0.0
[readme]: https://github.com/Crystal-Spider/jsdoc-generator
[changelog]: https://github.com/Crystal-Spider/jsdoc-generator/blob/main/CHANGELOG.md
