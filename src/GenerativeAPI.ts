import {GoogleGenerativeAI, GenerativeModel as Gemini} from '@google/generative-ai';
import {OpenAI} from 'openai';
import {LanguageModelChat as Copilot} from 'vscode';

import {SummarizedParameter, NodeType, getConfig} from './extension';

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
   * @type {Model}
   */
  protected get model() {
    return getConfig('generativeModel', 'gpt-5');
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
        tools: [
          {
            type: 'function',
            function: {
              name: 'generate_jsdoc',
              description: `Given the ${type} textual description (no tags) in ${GenerativeModel.language}, generates its JSDoc`,
              parameters: {
                type: 'object',
                properties: {
                  description: {
                    type: 'string',
                    // eslint-disable-next-line max-len
                    description: `The ${type} description in ${GenerativeModel.language}, without tags and no ${type !== 'function' && type !== 'enum' ? 'attributes, methods, or ' : ''}parameters or type parameters description. The description must be very short and high-level. Each sentence on a new line, if more than one are necessary, on a new line.`
                  }
                },
                required: ['description']
              }
            }
          }
        ],
        // eslint-disable-next-line @typescript-eslint/naming-convention, camelcase
        tool_choice: {
          type: 'function',
          function: {
            name: 'generate_jsdoc'
          }
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
      })).choices[0].message.tool_calls?.[0].function.arguments;
      if (args) {
        try {
          return JSON.parse(args).description;
        } catch (error) {
          console.error(error);
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
        tools: [
          {
            type: 'function',
            function: {
              name: 'generate_jsdoc',
              description: `Given the ${generics ? 'type ' : ''} parameters textual descriptions in ${GenerativeModel.language}, generates its JSDoc`,
              parameters: {
                type: 'object',
                properties: {
                  descriptions: {
                    type: 'object',
                    description: `A record of <${generics ? 'type ' : ''} parameter name, description in ${GenerativeModel.language}> pairs. The descriptions must be very short and high-level.`,
                    properties: parameters.reduce((prev, curr) => ({...prev, [curr.name]: {type: 'string', description: `Textual description in ${GenerativeModel.language} for the ${curr.name} ${generics ? 'type ' : ''} parameter.`} }), {})
                  }
                },
                required: ['descriptions']
              }
            }
          }
        ],
        // eslint-disable-next-line @typescript-eslint/naming-convention, camelcase
        tool_choice: {
          type: 'function',
          function: {
            name: 'generate_jsdoc'
          }
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
      })).choices[0].message.tool_calls?.[0].function.arguments;
      if (args) {
        try {
          const {descriptions} = JSON.parse(args);
          return descriptions ? parameters.map(param => descriptions[param.name] ?? '') : [];
        } catch (error) {
          console.error(error);
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
        tools: [
          {
            type: 'function',
            function: {
              name: 'generate_jsdoc',
              description: `Given the function return value textual description in ${GenerativeModel.language}, generates its JSDoc`,
              parameters: {
                type: 'object',
                properties: {
                  description: {
                    type: 'string',
                    description: `The return value description in ${GenerativeModel.language}. The description must be very short and high-level.`
                  }
                },
                required: ['description']
              }
            }
          }
        ],
        // eslint-disable-next-line @typescript-eslint/naming-convention, camelcase
        tool_choice: {
          type: 'function',
          function: {
            name: 'generate_jsdoc'
          }
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
      })).choices[0].message.tool_calls?.[0].function.arguments;
      if (args) {
        try {
          return JSON.parse(args).description;
        } catch (error) {
          console.error(error);
        }
      }
    }
    return undefined;
  }
}

/**
 * Generative AI model from Google.
 * 
 * @class GenerativeGemini
 * @typedef {GenerativeGemini}
 * @extends {GenerativeModel<Gemini>}
 */
class GenerativeGemini extends GenerativeModel<Gemini> {
  /**
   * @inheritdoc
   * 
   * @override
   */
  protected init(): Gemini {
    return new GoogleGenerativeAI(this.apiKey).getGenerativeModel({model: this.model});
  }

  /**
   * @inheritdoc
   * 
   * @override
   */
  public async describeSnippet(content: string, type: NodeType): Promise<string | undefined> {
    if (this.api) {
      /**
       * Getting the model to generate content (check out structured output).
       * 
       * const res = await this.api.generateContent('');
       * res.response...
       */
    }
    throw new Error('Method not implemented.');
  }

  /**
   * @inheritdoc
   * 
   * @override
   */
  public async describeParameters(content: string, type: NodeType, generics: boolean, parameters: SummarizedParameter[]): Promise<string[] | undefined> {
    throw new Error('Method not implemented.');
  }

  /**
   * @inheritdoc
   * 
   * @override
   */
  public async describeReturn(content: string): Promise<string | undefined> {
    throw new Error('Method not implemented.');
  }
}

/**
 * Generative AI model from Copilot.
 * 
 * @class GenerativeCopilot
 * @typedef {GenerativeCopilot}
 * @extends {GenerativeModel<Copilot>}
 */
class GenerativeCopilot extends GenerativeModel<Copilot> {
  /**
   * @inheritdoc
   * 
   * @override
   */
  protected override init(): Copilot {
    /**
     * Init model with access from within VSC:
     * 
     * let [model] = await lm.selectChatModels({vendor: 'copilot', family: 'gpt-4o'});
     * model.sendRequest([], {}, undefined);
     * (ExtensionContext context).languageModelAccessInformation.canSendRequest();
     * 
     * Init model with access from API key:
     * Probably need to use JS fetch to call the endpoint.
     */
    throw new Error('Method not implemented.');
  }

  /**
   * @inheritdoc
   * 
   * @override
   */
  public override describeSnippet(content: string, type: NodeType): Promise<string | undefined> {
    throw new Error('Method not implemented.');
  }

  /**
   * @inheritdoc
   * 
   * @override
   */
  public override describeParameters(content: string, type: NodeType, generics: boolean, parameters: SummarizedParameter[]): Promise<string[] | undefined> {
    throw new Error('Method not implemented.');
  }

  /**
   * @inheritdoc
   * 
   * @override
   */
  public override describeReturn(content: string): Promise<string | undefined> {
    throw new Error('Method not implemented.');
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
  private static generator?: GenerativeModel<OpenAI | Gemini | Copilot>;

  /**
   * Model kind.
   *
   * @protected
   * @readonly
   * @type {Model}
   */
  protected get model() {
    return getConfig('generativeModel', 'gpt-5');
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
