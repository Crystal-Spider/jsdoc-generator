/* eslint-disable jsdoc/require-jsdoc */
import {OpenAI} from 'openai';
import PaLM from 'palm-api';
import {Example} from 'palm-api/out/google-ai-types';

import {getConfig} from './extension';

type NodeType = 'function' | 'class' | 'interface' | 'type' | 'enum' | 'property';

abstract class GenerativeModel<T> {
  protected api?: T;

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

  public abstract chat(content: string, type: NodeType, examples?: Example[]): Promise<string | undefined>;

  public abstract translate(content: string): Promise<string | undefined>;
}

class GenerativeOpenAI extends GenerativeModel<OpenAI> {
  protected override init(): OpenAI {
    return new OpenAI({apiKey: this.apiKey});
  }

  public override async chat(content: string, type: NodeType): Promise<string | undefined> {
    if (this.api) {
      const args = (await this.api.chat.completions.create({
        model: this.model,
        functions: [
          {
            name: 'generate_jsdoc',
            description: `Given the ${type} description, generates its JSDoc`,
            parameters: {
              type: 'object',
              properties: {
                description: {
                  type: 'string',
                  description: `The ${type} description`
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
            content
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

  public override async translate(content: string): Promise<string | undefined> {
    if (this.api) {
      return (await this.api.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful translator assistant.'
          }, {
            role: 'user',
            content
          }
        ]
      })).choices[0].message.content ?? '';
    }
    return undefined;
  }
}

class GenerativePaLM extends GenerativeModel<PaLM> {
  protected override init(): PaLM {
    return new PaLM(this.apiKey);
  }

  public override async chat(content: string, type: NodeType, examples?: Example[]): Promise<string | undefined> {
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

  public override async translate(content: string): Promise<string | undefined> {
    if (this.api) {
      return this.api.ask(content, {
        context: 'context',
        // Or PaLM.FORMATS.JSON
        format: PaLM.FORMATS.MD
      });
    }
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
   * Selected language.
   *
   * @private
   * @static
   * @readonly
   * @type {Language}
   */
  private static get language() {
    return getConfig('generativeLang', 'English');
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

  public static async chat(content: string, type: NodeType, examples?: Example[]) {
    if (GenerativeAPI.generator) {
      const description = await GenerativeAPI.generator.chat(content, type, examples);
      if (description && GenerativeAPI.language !== 'English') {
        return await GenerativeAPI.generator.translate(`Translate the following text in ${GenerativeAPI.language}:\n${description}`);
      }
      return description;
    }
    return undefined;
  }
}

export {NodeType, GenerativeAPI};
