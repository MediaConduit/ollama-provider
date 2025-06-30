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
      
      // Configure axios to handle streaming response
      const response = await this.client.post('/api/pull', { name: modelName }, {
        responseType: 'text', // Get raw text to parse NDJSON manually
        timeout: 300000 // 5 minutes timeout for pulling
      });
      
      if (response.status === 200) {
        // Parse the NDJSON (newline-delimited JSON) response
        const lines = response.data.split('\n').filter((line: string) => line.trim());
        let hasError = false;
        let lastStatus = '';
        
        for (const line of lines) {
          try {
            const json = JSON.parse(line);
            
            if (json.error) {
              console.error(`❌ Failed to pull model ${modelName}: ${json.error}`);
              hasError = true;
              break;
            }
            
            if (json.status) {
              lastStatus = json.status;
              // Show progress for large models
              if (json.total && json.completed) {
                const percent = Math.round((json.completed / json.total) * 100);
                console.log(`📥 ${modelName}: ${json.status} (${percent}%)`);
              } else {
                console.log(`📥 ${modelName}: ${json.status}`);
              }
            }
          } catch (parseError) {
            // Skip invalid JSON lines
            continue;
          }
        }
        
        if (hasError) {
          return false;
        }
        
        // Check if we got a success status
        if (lastStatus && (lastStatus.includes('success') || lastStatus.includes('complete'))) {
          console.log(`✅ Successfully pulled model: ${modelName}`);
          return true;
        } else if (lastStatus) {
          console.log(`🔄 Ollama accepted pull request for model: ${modelName}`);
          return true;
        } else {
          console.error(`❌ No status received for model ${modelName}`);
          return false;
        }
      } else {
        console.error(`❌ Failed to pull model ${modelName}: HTTP ${response.status}`);
        return false;
      }
    } catch (error: any) {
      // Check if it's a 404 or model not found error
      if (error.response?.status === 404 || 
          error.message.includes('not found') || 
          error.message.includes('model not found')) {
        console.error(`❌ Model ${modelName} not found in Ollama registry`);
        return false;
      }
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
      const pullResult = await this.pullModel(modelName);
      
      if (!pullResult) {
        console.error(`❌ Model ${modelName} could not be pulled (may not exist)`);
        return false;
      }
      
      // Verify the model was actually pulled by checking again
      const updatedModels = await this.getInstalledModels();
      const isNowAvailable = updatedModels.includes(modelName);
      
      if (!isNowAvailable) {
        console.error(`❌ Model ${modelName} was not found after pull attempt`);
        return false;
      }
      
      return true;
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
