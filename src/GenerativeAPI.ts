/* eslint-disable jsdoc/require-jsdoc */
import {OpenAI} from 'openai';
import PaLM from 'palm-api';
import {Example} from 'palm-api/out/google-ai-types';

import {getConfig} from './extension';

/**
 * Summarized infos of a parameter.
 *
 * @interface SummarizedParameter
 * @typedef {SummarizedParameter}
 */
interface SummarizedParameter {
  /**
   * Parameter name.
   *
   * @type {string}
   */
  name: string;
  /**
   * Parameter type.
   *
   * @type {string}
   */
  type: string;
}

type NodeType = 'function' | 'class' | 'interface' | 'type' | 'enum' | 'property';

abstract class GenerativeModel<T> {
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

  protected get model() {
    return getConfig('generativeModel', 'bard');
  }

  protected get apiKey() {
    return getConfig('generativeApiKey', '');
  }

  public constructor() {
    if (!this.api && this.apiKey) {
      this.api = this.init();
    }
  }

  protected abstract init(): T;

  public abstract describeSnippet(content: string, type: NodeType, examples?: Example[]): Promise<string | undefined>;

  public abstract describeParameters(content: string, type: NodeType, generics: boolean, typeParameters: SummarizedParameter[], examples?: Example[]): Promise<string[] | undefined>;

  public abstract describeReturn(content: string, examples?: Example[]): Promise<string | undefined>;
}

class GenerativeOpenAI extends GenerativeModel<OpenAI> {
  protected override init(): OpenAI {
    return new OpenAI({apiKey: this.apiKey});
  }

  public override async describeSnippet(content: string, type: NodeType): Promise<string | undefined> {
    if (this.api) {
      const args = (await this.api.chat.completions.create({
        model: this.model,
        functions: [
          {
            name: 'generate_jsdoc',
            description: `Given the ${type} textual description in ${GenerativeModel.language}, generates its JSDoc`,
            parameters: {
              type: 'object',
              properties: {
                description: {
                  type: 'string',
                  description: `The ${type} description in ${GenerativeModel.language}, only textual and without tags`
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

  public override async describeParameters(content: string, type: NodeType, generics: boolean, typeParameters: SummarizedParameter[]): Promise<string[] | undefined> {
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
                  properties: typeParameters.reduce((prev, curr) => ({...prev, [curr.name]: {type: 'string', description: `Textual description in ${GenerativeModel.language} for the ${curr.name} ${generics ? 'type ' : ''} parameter`} }), {})
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
          return descriptions ? typeParameters.map(param => descriptions[param.name] ?? '') : [];
        } catch (error) {
          // Return undefined below.
        }
      }
    }
    return undefined;
  }

  public override async describeReturn(content: string, examples?: Example[] | undefined): Promise<string | undefined> {
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

class GenerativePaLM extends GenerativeModel<PaLM> {
  protected override init(): PaLM {
    return new PaLM(this.apiKey);
  }

  public override async describeSnippet(content: string, type: NodeType, examples?: Example[]): Promise<string | undefined> {
    if (this.api) {
      return this.api.ask(content, {
        context: 'context',
        examples: examples || [],
        // Or PaLM.FORMATS.JSON
        format: PaLM.FORMATS.MD
      });
    }
    return undefined;
  }

  public override async describeParameters(content: string, type: NodeType, generics: boolean, typeParameters: SummarizedParameter[], examples?: Example[] | undefined): Promise<string[] | undefined> {
    return undefined;
  }

  public override async describeReturn(content: string, examples?: Example[] | undefined): Promise<string | undefined> {
    return undefined;
  }

  public newChat() {
    if (this.api) {
      return this.api.createChat({examples: []});
    }
    return null;
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
  private static generator?: GenerativeModel<OpenAI | PaLM>;

  /**
   * Selected model.
   *
   * @private
   * @static
   * @readonly
   * @type {'gpt-3.5-turbo' | 'gpt-4' | 'bard'}
   */
  private static get model() {
    return getConfig('generativeModel', 'bard');
  }

  /**
   * Checks if the {@link GenerativeModel} instance is loaded and, if not, attempts to load it.
   *
   * @public
   * @static
   * @returns {boolean} whether the {@link GenerativeModel} instance is loaded.
   */
  public static tryInit(): boolean {
    if (!GenerativeAPI.generator && getConfig('generativeApiKey', '')) {
      if (this.model === 'bard') {
        GenerativeAPI.generator = new GenerativePaLM();
      } else {
        GenerativeAPI.generator = new GenerativeOpenAI();
      }
    }
    return !!GenerativeAPI.generator;
  }

  public static async describeSnippet(content: string, type: NodeType, examples?: Example[]) {
    if (GenerativeAPI.generator) {
      return await GenerativeAPI.generator.describeSnippet(content, type, examples);
    }
    return undefined;
  }

  public static async describeParameters(content: string, type: NodeType, generics: boolean, typeParameters: SummarizedParameter[], examples?: Example[]) {
    if (GenerativeAPI.generator && (generics ? getConfig('generateDescriptionForTypeParameters', false) : getConfig('generateDescriptionForParameters', false))) {
      return await GenerativeAPI.generator.describeParameters(content, type, generics, typeParameters, examples);
    }
    return undefined;
  }

  public static async describeReturn(content: string, examples?: Example[]) {
    if (GenerativeAPI.generator && getConfig('generateDescriptionForReturns', false)) {
      return await GenerativeAPI.generator.describeReturn(content, examples);
    }
    return undefined;
  }
}

export {NodeType, GenerativeAPI};
