import axios, { AxiosInstance } from 'axios';

export interface OllamaConfig {
  baseUrl?: string;
  timeout?: number;
}

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
}

export interface OllamaGenerateResponse {
  response: string;
  model: string;
}

export class OllamaAPIClient {
  private client: AxiosInstance;
  private config: Required<OllamaConfig>;

  constructor(config: OllamaConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:11434',
      timeout: config.timeout || 300000,
    };

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.client.get('/api/tags');
      return true;
    } catch {
      return false;
    }
  }

  async getInstalledModels(): Promise<string[]> {
    try {
      const { data } = await this.client.get('/api/tags');
      if (data && Array.isArray(data.models)) {
        return data.models.map((model: any) => model.name || model.model);
      }
      return [];
    } catch (error: any) {
      console.warn(`[OllamaAPIClient] Failed to get installed models: ${error.message}`);
      return [];
    }
  }

  async pullModel(modelName: string): Promise<boolean> {
    try {
      console.log(`🔄 Pulling Ollama model: ${modelName}`);
      await this.client.post('/api/pull', { name: modelName });
      console.log(`✅ Successfully pulled model: ${modelName}`);
      return true;
    } catch (error: any) {
      console.error(`❌ Failed to pull model ${modelName}: ${error.message}`);
      return false;
    }
  }

  async ensureModelAvailable(modelName: string): Promise<boolean> {
    try {
      // First check if model is already installed
      const installedModels = await this.getInstalledModels();
      if (installedModels.includes(modelName)) {
        return true;
      }
      
      // If not installed, try to pull it
      console.log(`📥 Model ${modelName} not found locally, attempting to pull...`);
      return await this.pullModel(modelName);
    } catch (error: any) {
      console.error(`❌ Failed to ensure model availability: ${error.message}`);
      return false;
    }
  }

  async generateText(request: OllamaGenerateRequest): Promise<OllamaGenerateResponse> {
    const { data } = await this.client.post('/api/generate', {
      model: request.model,
      prompt: request.prompt,
      stream: request.stream ?? false,
    });
    
    if (!data || typeof data.response !== 'string') {
      throw new Error('Invalid response from Ollama');
    }
    
    return { response: data.response, model: data.model || request.model };
  }
}
