import { OllamaAPIClient } from './OllamaAPIClient';
import { 
  TextToTextModel,
  ModelConfig,
  TextToTextOptions,
  Text
} from './types';

export interface OllamaTextToTextConfig extends ModelConfig {
  apiClient: OllamaAPIClient;
  modelId: string;
}

export class OllamaTextToTextModel extends TextToTextModel {
  private apiClient: OllamaAPIClient;
  private modelId: string;

  constructor(config: OllamaTextToTextConfig) {
    // Pass the model configuration to the base class
    super({
      id: config.modelId,
      name: `Ollama ${config.modelId}`,
      description: `Ollama ${config.modelId} text generation model`,
      capabilities: config.capabilities || ['text-to-text'],
      parameters: config.parameters || {}
    });
    
    this.apiClient = config.apiClient;
    this.modelId = config.modelId;
  }

  async transform(input: string | Text | string[] | Text[], options?: any): Promise<Text> {
    const start = Date.now();
    
    let text: Text;
    if (Array.isArray(input)) {
      text = typeof input[0] === 'string' ? Text.fromString(input[0]) : input[0];
    } else {
      text = typeof input === 'string' ? Text.fromString(input) : input;
    }

    if (!text.isValid()) {
      throw new Error('Invalid text input');
    }

    const result = await this.apiClient.generateText({ 
      model: this.modelId, 
      prompt: text.content 
    });
    
    const processingTime = Date.now() - start;

    return Text.fromString(result.response, {
      processingTime,
      model: this.modelId,
      provider: 'ollama',
      originalPrompt: text.content,
    });
  }

  async generate(prompt: string, options?: any): Promise<Text> {
    return this.transform(prompt, options);
  }

  async isAvailable(): Promise<boolean> {
    return this.apiClient.testConnection();
  }
}
