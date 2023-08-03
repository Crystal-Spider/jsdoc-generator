import {OpenAI} from 'openai';

import {getConfig} from './extension';

/**
 * API Key: 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.
 *
 * @export
 * @class ChatGPT
 * @typedef {ChatGPT}
 */
export class ChatGPT {
  /**
   * Lazy loaded {@link OpenAI} instance.
   *
   * @private
   * @static
   * @type {?OpenAI}
   */
  private static openai?: OpenAI;

  private static get model() {
    return getConfig('chatgpt4', false) ? 'gpt-4' : 'gpt-3.5-turbo';
  }

  /**
   * Checks if the {@link OpenAI} instance is loaded and, if not, attempts to load it.
   *
   * @public
   * @static
   * @returns {boolean} whether the {@link OpenAI} instance is loaded.
   */
  public static tryInit(): boolean {
    const apiKey = getConfig('chatgptApiKey', '');
    if (!ChatGPT.openai && apiKey) {
      ChatGPT.openai = new OpenAI({apiKey});
    }
    return !!ChatGPT.openai;
  }

  public static async chat(content: string) {
    if (ChatGPT.openai) {
      return (await ChatGPT.openai.chat.completions.create({
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
