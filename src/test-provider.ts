// Quick test to verify the provider works
import { OllamaDockerProvider } from './OllamaDockerProvider';

async function testOllamaProvider() {
  console.log('🧪 Testing Ollama provider...');

  // Create provider instance
  const provider = new OllamaDockerProvider();
  console.log(`✅ Provider created: ${provider.name} (${provider.id})`);
  
  // Test basic properties
  console.log(`🎯 Type: ${provider.type}`);
  console.log(`⚡ Capabilities: ${provider.capabilities.join(', ')}`);
  console.log(`📦 Models: ${provider.models.length} configured`);
  
  // Test configuration
  await provider.configure({
    baseUrl: 'http://localhost:11434'
  });
  console.log(`🔧 Provider configured`);
  
  // Test availability (will fail if Ollama not running, but that's expected)
  try {
    const available = await provider.isAvailable();
    console.log(`🔍 Provider available: ${available}`);
    
    if (available) {
      const health = await provider.getHealth();
      console.log(`💚 Health status: ${health.status}`);
    }
  } catch (error) {
    console.log(`⚠️  Provider not available (Ollama service not running): ${error.message}`);
  }
  
  console.log('✅ Provider test completed!');
}

// Run the test
testOllamaProvider().catch(console.error);
