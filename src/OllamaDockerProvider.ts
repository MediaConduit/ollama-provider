import { 
  MediaProvider,
  ProviderType,
  MediaCapability,
  ProviderModel,
  ProviderConfig
} from '@mediaconduit/src/media/types/provider';
import { OllamaAPIClient } from './OllamaAPIClient';

export class OllamaDockerProvider implements MediaProvider {
  readonly id: string = 'ollama-docker-provider';
  readonly name: string = 'Ollama Docker Provider';
  readonly type: ProviderType = ProviderType.LOCAL;
  readonly capabilities: MediaCapability[] = [MediaCapability.TEXT_TO_TEXT];
  readonly models: ProviderModel[] = []; // Dynamically populated

  private dockerService?: any;
  private apiClient?: OllamaAPIClient;
  private cachedModels: string[] = [];
  private modelsLastFetched = 0;
  private readonly MODEL_CACHE_TTL = 300000; // 5 minutes

  constructor(dockerService?: any) {
    this.dockerService = dockerService;
    console.log(`🔧 ${this.name} initialized with service:`, dockerService?.constructor?.name);
    
    // Start background model discovery
    this.initializeModelDiscovery();
  }

  private async initializeModelDiscovery(): Promise<void> {
    // Wait a bit for service to be ready
    setTimeout(() => {
      this.refreshModelsCache().catch(() => {
        console.warn('Initial model discovery failed - will retry later');
      });
    }, 2000);
  }

  private async refreshModelsCache(): Promise<void> {
    const now = Date.now();
    if (now - this.modelsLastFetched < this.MODEL_CACHE_TTL && this.cachedModels.length > 0) {
      return; // Cache is still fresh
    }

    try {
      if (!this.apiClient) {
        // Configure API client with dynamic port from service
        const serviceInfo = this.dockerService?.getServiceInfo();
        if (serviceInfo?.ports?.[0]) {
          const port = serviceInfo.ports[0];
          this.apiClient = new OllamaAPIClient({ 
            baseUrl: `http://localhost:${port}` 
          });
        } else {
          console.warn('Service port not available for model discovery');
          return;
        }
      }
      
      const connected = await this.apiClient.testConnection();
      if (!connected) {
        console.warn('[OllamaProvider] Service not available for model refresh');
        return;
      }
      
      const installedModels = await this.apiClient.getInstalledModels();
      this.cachedModels = installedModels;
      this.modelsLastFetched = now;
      
      console.log(`🔄 Refreshed Ollama models cache: ${installedModels.length} models found`);
    } catch (error: any) {
      console.warn(`[OllamaProvider] Failed to refresh models cache: ${error.message}`);
    }
  }

  async configure(config: ProviderConfig): Promise<void> {
    // Configure API client with service port from docker service
    if (this.dockerService) {
      const serviceInfo = this.dockerService.getServiceInfo();
      if (serviceInfo.ports && serviceInfo.ports.length > 0) {
        const port = serviceInfo.ports[0];
        this.apiClient = new OllamaAPIClient({ 
          baseUrl: `http://localhost:${port}` 
        });
        console.log(`🔗 Ollama configured with dynamic port: ${port}`);
      }
    }
    
    // Start model discovery
    await this.refreshModelsCache();
  }

  async isAvailable(): Promise<boolean> {
    try {
      if (this.dockerService) {
        const status = await this.dockerService.getServiceStatus();
        return status.running && status.health === 'healthy';
      }
      return false;
    } catch (error: any) {
      console.error(`Error checking ${this.name} availability:`, error);
      return false;
    }
  }

  getModelsForCapability(capability: MediaCapability): ProviderModel[] {
    if (capability === MediaCapability.TEXT_TO_TEXT) {
      return this.cachedModels.map(id => ({
        id,
        name: `Ollama ${id}`,
        description: `Local Ollama model: ${id}`,
        capabilities: [MediaCapability.TEXT_TO_TEXT],
        parameters: {
          temperature: 0.7,
          maxTokens: 4096,
          topP: 0.9
        },
        pricing: { inputCost: 0, outputCost: 0, currency: 'USD' },
      }));
    }
    return [];
  }

  async getModel(modelId: string): Promise<any> {
    if (!this.apiClient) {
      throw new Error('Provider not configured. Please call configure() first.');
    }

    // Ensure the model is available (pull if necessary)
    const isAvailable = await this.apiClient.ensureModelAvailable(modelId);
    if (!isAvailable) {
      throw new Error(`Failed to ensure model ${modelId} is available. Check Ollama connectivity and model name.`);
    }
    
    // Refresh cache after potentially pulling a new model
    this.modelsLastFetched = 0; // Force cache refresh
    await this.refreshModelsCache();
    
    const { OllamaTextToTextModel } = await import('./OllamaTextToTextModel');
    return new OllamaTextToTextModel({ 
      id: modelId,
      name: `Ollama ${modelId}`,
      description: `Ollama ${modelId} text generation model`,
      capabilities: [MediaCapability.TEXT_TO_TEXT],
      apiClient: this.apiClient, 
      modelId 
    });
  }

  async getHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    uptime: number;
    activeJobs: number;
    queuedJobs: number;
    lastError?: string;
    models?: number;
    lastModelRefresh?: string;
  }> {
    const isAvailable = await this.isAvailable();
    return {
      status: isAvailable ? 'healthy' : 'unhealthy',
      uptime: Date.now(),
      activeJobs: 0,
      queuedJobs: 0,
      lastError: isAvailable ? undefined : 'Service not available',
      models: this.cachedModels.length,
      lastModelRefresh: new Date(this.modelsLastFetched).toISOString()
    };
  }

  // Docker service management
  async startService(): Promise<boolean> {
    if (this.dockerService && this.dockerService.startService) {
      const result = await this.dockerService.startService();
      if (result) {
        // Wait a bit for service to be ready, then discover models
        setTimeout(() => {
          this.refreshModelsCache().catch(() => {});
        }, 3000);
      }
      return result;
    }
    return false;
  }

  async stopService(): Promise<boolean> {
    if (this.dockerService && this.dockerService.stopService) {
      return await this.dockerService.stopService();
    }
    return false;
  }
}
