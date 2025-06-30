import { TextRole } from '@mediaconduit/mediaconduit/src/media/assets/roles';
import { OllamaAPIClient } from './OllamaAPIClient';
import { 
  TextToTextModel,
  TextToTextOptions,
  Text
} from './types';
import { createGenerationPrompt } from '@mediaconduit/mediaconduit/src/media/utils/GenerationPromptHelper';

export interface OllamaTextToTextConfig {
  apiClient: OllamaAPIClient;
  modelId: string;
  id: string;
  name: string;
  description: string;
  capabilities: string[];
}

export class OllamaTextToTextModel extends TextToTextModel {
  private apiClient: OllamaAPIClient;
  private modelId: string;

  constructor(config: OllamaTextToTextConfig) {
    // Pass the model configuration to the base class
    super({
      id: config.id,
      name: config.name,
      description: config.description,
      version: '1.0.0',
      provider: 'ollama',
      capabilities: config.capabilities || ['text-to-text'],
      inputTypes: ['text/plain'],
      outputTypes: ['text/plain']
    });
    
    this.apiClient = config.apiClient;
    this.modelId = config.modelId;
  }

  async transform(input: string | TextRole | string[] | TextRole[], options?: TextToTextOptions): Promise<Text> {
    const start = Date.now();
    
    let text: Text;
    if (Array.isArray(input)) {
      text = typeof input[0] === 'string' ? await Text.fromString(input[0]).asRole(Text) : await input[0].asRole(Text);
    } else {
      text = typeof input === 'string' ? await Text.fromString(input).asRole(Text) : await input.asRole(Text);
    }

    if (!text.isValid()) {
      throw new Error('Invalid text input');
    }

    const result = await this.apiClient.generateText({ 
      model: this.modelId, 
      prompt: text.content 
    });
    
    const processingTime = Date.now() - start;

    return Text.fromString(
      result.response, 
      text.language || 'auto', // Preserve input language
      1.0, // High confidence for successful generation
      {
        processingTime,
        model: this.modelId,
        provider: 'ollama',
        originalPrompt: text.content,
        generation_prompt: createGenerationPrompt({
          input: input, // RAW input object to preserve generation chain
          options: options,
          modelId: this.modelId,
          modelName: `Ollama ${this.modelId}`,
          provider: 'ollama',
          transformationType: 'text-to-text',
          processingTime
        })
      },
      text.sourceAsset // Preserve source Asset reference
    );
  }

  async generate(prompt: string, options?: any): Promise<Text> {
    return this.transform(prompt, options);
  }

  async isAvailable(): Promise<boolean> {
    return this.apiClient.testConnection();
  }
}
