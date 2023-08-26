import {OpenAI} from 'openai';
import {PaLM} from 'palm-api';

import {getConfig} from './extension';

abstract class GenerativeModel<T> {
  protected api?: T;

  protected get model() {
    return getConfig('generativeModel', '');
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

  public abstract chat(content: string, examples?: [string, string][]): Promise<string | null | undefined>;
}

class GenerativeOpenAI extends GenerativeModel<OpenAI> {
  protected init(): OpenAI {
    return new OpenAI({apiKey: this.apiKey});
  }

  public async chat(content: string): Promise<string | null | undefined> {
    if (this.api) {
      return (await this.api.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'user',
            content
          }
        ]
      })).choices[0].message.content;
    }
    return null;
  }
}

class GenerativePaLM extends GenerativeModel<PaLM> {
  protected init(): PaLM {
    return new PaLM(this.apiKey);
  }

  // TODO: replace [string, string][] with the Example[] type from PaLM.
  public async chat(content: string, examples?: [string, string][]): Promise<string | null | undefined> {
    if (this.api) {
      this.api.ask(content, {
        context: 'context',
        examples: examples || [],
        // Or PaLM.FORMATS.JSON
        format: PaLM.FORMATS.MD
      });
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
export class GenerativeAPI {
  private static generator?: GenerativeModel<OpenAI | PaLM>;

  private static get model() {
    return getConfig('generativeModel', '');
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

  public static async chat(content: string, examples?: [string, string][]) {
    if (GenerativeAPI.generator) {
      return (await GenerativeAPI.generator.chat(content, examples));
    }
    return null;
  }
}
