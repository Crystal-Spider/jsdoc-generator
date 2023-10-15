import {OpenAI} from 'openai';
import PaLM from 'palm-api';

import {SummarizedParameter, getConfig} from './extension';

/**
 * TypeScript node type.
 *
 * @typedef {NodeType}
 */
type NodeType = 'function' | 'class' | 'interface' | 'type' | 'enum' | 'property';

/**
 * Generative AI model.
 *
 * @abstract
 * @class GenerativeModel
 * @typedef {GenerativeModel}
 * @template T
 */
abstract class GenerativeModel<T> {
  /**
   * API instance.
   *
   * @protected
   * @type {?T}
   */
  protected api?: T;

  /**
   * Selected language.
   *
   * @private
   * @static
   * @readonly
   * @type {Language}
   */
  protected static get language() {
    return getConfig('generativeLanguage', 'English');
  }

  /**
   * Model kind.
   *
   * @protected
   * @readonly
   * @type {("gpt-3.5-turbo" | "gpt-4")}
   */
  protected get model() {
    return getConfig('generativeModel', 'gpt-3.5-turbo');
  }

  /**
   * API access key.
   *
   * @protected
   * @readonly
   * @type {string}
   */
  protected get apiKey() {
    return getConfig('generativeApiKey', '');
  }

  /**
   * @constructor
   * @public
   */
  public constructor() {
    if (!this.api && this.apiKey) {
      this.api = this.init();
    }
  }

  /**
   * Initializes the API.
   *
   * @protected
   * @abstract
   * @returns {T}
   */
  protected abstract init(): T;

  /**
   * Describes a TypeScript snippet.
   *
   * @public
   * @abstract
   * @param {string} content
   * @param {NodeType} type
   * @returns {Promise<string | undefined>}
   */
  public abstract describeSnippet(content: string, type: NodeType): Promise<string | undefined>;

  /**
   * Describes parameters or type parameters.
   *
   * @public
   * @abstract
   * @param {string} content
   * @param {NodeType} type
   * @param {boolean} generics
   * @param {SummarizedParameter[]} parameters
   * @returns {Promise<string[] | undefined>} list of parameter descriptions, in the same order as the {@code parameters} parameter.
   */
  public abstract describeParameters(content: string, type: NodeType, generics: boolean, parameters: SummarizedParameter[]): Promise<string[] | undefined>;

  /**
   * Describes a function return value.
   *
   * @public
   * @abstract
   * @param {string} content
   * @returns {Promise<string | undefined>}
   */
  public abstract describeReturn(content: string): Promise<string | undefined>;
}

/**
 * Generative AI model from OpenAI.
 *
 * @class GenerativeOpenAI
 * @typedef {GenerativeOpenAI}
 * @extends {GenerativeModel<OpenAI>}
 */
class GenerativeOpenAI extends GenerativeModel<OpenAI> {
  /**
   * @inheritdoc
   * 
   * @override
   */
  protected override init(): OpenAI {
    return new OpenAI({apiKey: this.apiKey});
  }

  /**
   * @inheritdoc
   * 
   * @override
   */
  public override async describeSnippet(content: string, type: NodeType): Promise<string | undefined> {
    if (this.api) {
      const args = (await this.api.chat.completions.create({
        model: this.model,
        functions: [
          {
            name: 'generate_jsdoc',
            description: `Given the ${type} textual (no tags) description in ${GenerativeModel.language}, generates its JSDoc`,
            parameters: {
              type: 'object',
              properties: {
                description: {
                  type: 'string',
                  description: `The ${type} description in ${GenerativeModel.language}, without tags and no ${type !== 'function' && type !== 'enum' ? 'attributes, methods, or' : ''}parameters or type parameters description. Each sentence on a new line.`
                }
              },
              required: ['description']
            }
          }
        ],
        // eslint-disable-next-line @typescript-eslint/naming-convention, camelcase
        function_call: {
          name: 'generate_jsdoc'
        },
        messages: [
          {
            role: 'system',
            content: 'You are a TypeScript description generator'
          }, {
            role: 'user',
            content: `Generate the JSDoc for this ${type} in ${GenerativeModel.language}:\n${content}`
          }
        ]
      })).choices[0].message.function_call?.arguments;
      if (args) {
        try {
          return JSON.parse(args).description;
        } catch (error) {
          // Return undefined below.
        }
      }
    }
    return undefined;
  }

  /**
   * @inheritdoc
   * 
   * @override
   */
  public override async describeParameters(content: string, type: NodeType, generics: boolean, parameters: SummarizedParameter[]): Promise<string[] | undefined> {
    if (this.api) {
      const args = (await this.api.chat.completions.create({
        model: this.model,
        functions: [
          {
            name: 'generate_jsdoc',
            description: `Given the ${generics ? 'type ' : ''} parameters textual descriptions in ${GenerativeModel.language}, generates its JSDoc`,
            parameters: {
              type: 'object',
              properties: {
                descriptions: {
                  type: 'object',
                  description: `A record of <${generics ? 'type ' : ''} parameter name, description in ${GenerativeModel.language}> pairs`,
                  properties: parameters.reduce((prev, curr) => ({...prev, [curr.name]: {type: 'string', description: `Textual description in ${GenerativeModel.language} for the ${curr.name} ${generics ? 'type ' : ''} parameter`} }), {})
                }
              },
              required: ['descriptions']
            }
          }
        ],
        // eslint-disable-next-line @typescript-eslint/naming-convention, camelcase
        function_call: {
          name: 'generate_jsdoc'
        },
        messages: [
          {
            role: 'system',
            content: 'You are a TypeScript description generator'
          }, {
            role: 'user',
            content: `Generate the JSDoc for this ${type} in ${GenerativeModel.language}:\n${content}`
          }
        ]
      })).choices[0].message.function_call?.arguments;
      if (args) {
        try {
          const {descriptions} = JSON.parse(args);
          return descriptions ? parameters.map(param => descriptions[param.name] ?? '') : [];
        } catch (error) {
          // Return undefined below.
        }
      }
    }
    return undefined;
  }

  /**
   * @inheritdoc
   * 
   * @override
   */
  public override async describeReturn(content: string): Promise<string | undefined> {
    if (this.api) {
      const args = (await this.api.chat.completions.create({
        model: this.model,
        functions: [
          {
            name: 'generate_jsdoc',
            description: `Given the function return value textual description in ${GenerativeModel.language}, generates its JSDoc`,
            parameters: {
              type: 'object',
              properties: {
                description: {
                  type: 'string',
                  description: `The return value description in ${GenerativeModel.language}`
                }
              },
              required: ['description']
            }
          }
        ],
        // eslint-disable-next-line @typescript-eslint/naming-convention, camelcase
        function_call: {
          name: 'generate_jsdoc'
        },
        messages: [
          {
            role: 'system',
            content: 'You are a TypeScript description generator'
          }, {
            role: 'user',
            content: `Generate the JSDoc for this function in ${GenerativeModel.language}:\n${content}`
          }
        ]
      })).choices[0].message.function_call?.arguments;
      if (args) {
        try {
          return JSON.parse(args).description;
        } catch (error) {
          // Return undefined below.
        }
      }
    }
    return undefined;
  }
}

/**
 * Generative AI functionalities wrapper.  
 * Handles the use of whichever generative model is selected by the user.
 *
 * @export
 * @class GenerativeAPI
 * @typedef {GenerativeAPI}
 */
class GenerativeAPI {
  /**
   * AI Generator model instance. 
   *
   * @private
   * @static
   * @type {?GenerativeModel<OpenAI | PaLM>}
   */
  private static generator?: GenerativeModel<OpenAI | PaLM>;

  /**
   * Selected model.
   *
   * @private
   * @static
   * @readonly
   * @type {'gpt-3.5-turbo' | 'gpt-4'}
   */
  private static get model() {
    return getConfig('generativeModel', 'gpt-3.5-turbo');
  }

  /**
   * Checks if the {@link GenerativeModel} instance is loaded and, if not, attempts to load it.
   *
   * @public
   * @static
   * @returns {boolean} whether the {@link GenerativeModel} instance is loaded.
   */
  public static tryInit(): boolean {
    if (getConfig('generativeApiKey', '')) {
      GenerativeAPI.generator = new GenerativeOpenAI();
    } else {
      GenerativeAPI.generator = undefined;
    }
    return !!GenerativeAPI.generator;
  }

  /**
   * Describes with AI the given snippet content.
   *
   * @public
   * @static
   * @async
   * @param {string} content
   * @param {NodeType} type
   * @returns {Promise<string | undefined>}
   */
  public static async describeSnippet(content: string, type: NodeType): Promise<string | undefined> {
    return (GenerativeAPI.canGenerate() && await GenerativeAPI.generator?.describeSnippet(content.trim(), type));
  }

  /**
   * Describes with AI the given parameters.
   *
   * @public
   * @static
   * @async
   * @param {string} content
   * @param {NodeType} type
   * @param {boolean} generics
   * @param {SummarizedParameter[]} parameters
   * @returns {Promise<string[] | undefined>}
   */
  public static async describeParameters(content: string, type: NodeType, generics: boolean, parameters: SummarizedParameter[]): Promise<string[] | undefined> {
    return GenerativeAPI.canGenerate(getConfig(generics ? 'generateDescriptionForTypeParameters' : 'generateDescriptionForParameters', false)) && await GenerativeAPI.generator?.describeParameters(content.trim(), type, generics, parameters);
  }

  /**
   * Describes with AI the return value of the given content (function).
   *
   * @public
   * @static
   * @async
   * @param {string} content
   * @returns {Promise<string | undefined>}
   */
  public static async describeReturn(content: string): Promise<string | undefined> {
    return GenerativeAPI.canGenerate(getConfig('generateDescriptionForReturns', false)) && await GenerativeAPI.generator?.describeReturn(content.trim());
  }

  /**
   * Checks whether it's currently possible to call the AI generator model.
   *
   * @private
   * @static
   * @param {boolean} [config=true]
   * @returns {(true | undefined)}
   */
  private static canGenerate(config: boolean = true) {
    return GenerativeAPI.sanitizeBoolean(GenerativeAPI.tryInit() && config);
  }

  /**
   * Makes a boolean value suitable to be used in an and chain.
   *
   * @private
   * @static
   * @param {boolean} value
   * @returns {(true | undefined)}
   */
  private static sanitizeBoolean(value: boolean) {
    return value || undefined;
  }
}

export {NodeType, GenerativeAPI};
