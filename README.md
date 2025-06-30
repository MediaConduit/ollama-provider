# Ollama Provider

A dynamic MediaConduit provider for local Ollama LLM inference with automatic model discovery and management.

## Features

- **Dynamic Model Discovery**: Automatically discovers installed Ollama models
- **Automatic Model Pulling**: Downloads models when not available locally
- **Dynamic Port Assignment**: Works with ServiceRegistry for conflict-free port management
- **Advanced Caching**: Intelligent model caching with TTL for performance
- **Health Monitoring**: Comprehensive health checks and status reporting

## Installation

This provider is loaded dynamically by MediaConduit. No manual installation required.

## Usage

### Dynamic Loading
```typescript
import { getProvider } from 'mediaconduit';

// Load provider from GitHub
const provider = await getProvider('https://github.com/MediaConduit/ollama-provider');

// Start the service
await provider.startService();

// Get available models
const models = provider.getModelsForCapability('text-to-text');

// Use a model
const model = await provider.getModel('llama2');
const result = await model.transform('Hello, how are you?');
```

### Core SDK Usage
```typescript
import { ProviderRegistry } from 'mediaconduit';

const registry = ProviderRegistry.getInstance();
const provider = await registry.getProvider('https://github.com/MediaConduit/ollama-provider');
const model = await provider.getModel('llama2');
const result = await model.generate('Tell me a story about AI');
```

## Configuration

The provider automatically configures with the Ollama service. Configuration options:

- `temperature`: Controls randomness (0.0-1.0, default: 0.7)
- `maxTokens`: Maximum tokens to generate (default: 4096)
- `topP`: Top-p sampling parameter (default: 0.9)

## Models

This provider supports dynamic model discovery. Common models include:

- **llama2**: Meta's Llama 2 model series
- **codellama**: Code-specialized Llama model
- **mistral**: Mistral AI models
- **neural-chat**: Intel's neural chat model
- **orca-mini**: Microsoft's Orca model variant

Models are automatically pulled if not available locally.

## Requirements

- Docker and Docker Compose
- Ollama service (automatically managed via MediaConduit ServiceRegistry)
- Internet connection for model downloads

## Service Integration

This provider integrates with the MediaConduit Ollama service:
- **Service Repository**: `https://github.com/MediaConduit/ollama-service`
- **Dynamic Port**: Automatically assigned to avoid conflicts
- **Health Monitoring**: Continuous service health checking
- **Auto-restart**: Service automatically restarts if needed

## Development

### Building
```bash
npm run build
```

### Testing
```bash
npm test
```

### Development Mode
```bash
npm run dev
```

## Contributing

Contributions are welcome! Please follow the MediaConduit provider development guidelines.

## License

MIT License - see LICENSE file for details.
