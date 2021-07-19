# jsdoc-generator README
Automatic JSDoc generator for TypeScript.

---
## Features

Describe specific features of your extension including screenshots of your extension in action. Image paths are relative to this README file.

For example if there is an image subfolder under your extension project workspace:

\!\[feature X\]\(images/feature-x.png\)

> Tip: Many popular extensions utilize animations. This is an excellent way to show off your extension! We recommend short, focused animations that are easy to follow.

## Extension Settings
This extension contributes the following settings:

* `jsdoc-generator.descriptionPlaceholder`:\
Set the description placeholder. Empty to disable.\
Default: `"Description placeholder"`
* `jsdoc-generator.author`:\
Set the value for the author tag.\
Empty to disable, set to "author" to insert "author" as placeholder.\
Default: `""`
* `jsdoc-generator.includeDate`:\
When enabled, will include the date tag.\
Default: `false`
* `jsdoc-generator.includeTime`:\
When both this and jsdoc-generator.includeDate are enabled, will include the current local time in the date tag.\
Default: `true`
* `jsdoc-generator.includeParenthesisForMultipleTypes`:\
When enabled, will include round brackets around union and intersection types.\
Note that round brackets will still be used if manually put in the type or for union and intersection types which are also optional or mandatory.\
Default: `true`
* `jsdoc-generator.descriptionForConstructors`:\
"{Object}" will be replaced with the class name.\
For default exported classes without a name `jsdoc-generator.descriptionPlaceholder` will be used instead.\
Empty to disable.\
Default: `"Creates an instance of {Object}."`
* `jsdoc-generator.functionVariablesAsFunctions`:\
When enabled, will document variables with a function assigned as function declarations.\
Disable to document like properties.\
Default: `true`

---
## Known Issues
Type inference does not work for variable declarations without an initializer.

---
## Release Notes
### 1.0.0

Initial release of JSDoc Generator
