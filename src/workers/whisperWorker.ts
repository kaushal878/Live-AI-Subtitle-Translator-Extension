// Whisper Web Worker for AI transcription
// This worker handles Whisper AI model loading and audio processing

let whisperModel: any = null;
let isModelLoaded = false;
let currentSettings: any = {
  model: 'base',
  sampleRate: 16000
};

// Worker message handler
self.onmessage = async (event: MessageEvent) => {
  const { type, payload } = event.data;

  try {
    switch (type) {
      case 'INITIALIZE':
        await initialize(payload);
        break;

      case 'LOAD_MODEL':
        await loadModel();
        break;

      case 'TRANSCRIBE_AUDIO':
        const result = await transcribeAudio(payload);
        self.postMessage({ type: 'TRANSCRIPTION_RESULT', data: result });
        break;

      case 'UPDATE_SETTINGS':
        currentSettings = { ...currentSettings, ...payload };
        break;

      case 'STOP_TRANSCRIPTION':
        // Handle cleanup if needed
        break;

      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    self.postMessage({ 
      type: 'ERROR', 
      data: (error as Error).message 
    });
  }
};

async function initialize(settings: any) {
  currentSettings = { ...currentSettings, ...settings };
  console.log('Whisper worker initialized with settings:', currentSettings);
}

async function loadModel() {
  try {
    // In a real implementation, this would load the actual Whisper model
    // For now, we'll simulate model loading
    console.log(`Loading Whisper model: ${currentSettings.model}`);
    
    // Simulate model loading delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    isModelLoaded = true;
    self.postMessage({ type: 'MODEL_LOADED' });
    
    console.log('Whisper model loaded successfully');
  } catch (error) {
    console.error('Failed to load Whisper model:', error);
    throw error;
  }
}

async function transcribeAudio(payload: { audioData: ArrayBuffer; sampleRate: number; timestamp: number }) {
  if (!isModelLoaded) {
    throw new Error('Whisper model not loaded');
  }

  const { audioData, sampleRate, timestamp } = payload;
  
  try {
    // Convert ArrayBuffer to Float32Array if needed
    const audioBuffer = new Float32Array(audioData);
    
    // Preprocess audio
    const processedAudio = preprocessAudio(audioBuffer, sampleRate);
    
    // Simulate Whisper inference
    const transcriptionResult = await simulateWhisperInference(processedAudio);
    
    return {
      text: transcriptionResult.text,
      confidence: transcriptionResult.confidence,
      timestamp,
      duration: processedAudio.length / currentSettings.sampleRate
    };
    
  } catch (error) {
    console.error('Transcription error:', error);
    throw error;
  }
}

function preprocessAudio(audioData: Float32Array, sampleRate: number): Float32Array {
  // Resample if necessary
  if (sampleRate !== currentSettings.sampleRate) {
    audioData = resampleAudio(audioData, sampleRate, currentSettings.sampleRate);
  }
  
  // Normalize audio
  audioData = normalizeAudio(audioData);
  
  // Apply noise reduction if needed
  audioData = applyNoiseReduction(audioData);
  
  return audioData;
}

function resampleAudio(audioData: Float32Array, fromRate: number, toRate: number): Float32Array {
  // Simple linear interpolation resampling
  const ratio = fromRate / toRate;
  const newLength = Math.floor(audioData.length / ratio);
  const resampled = new Float32Array(newLength);
  
  for (let i = 0; i < newLength; i++) {
    const originalIndex = i * ratio;
    const index = Math.floor(originalIndex);
    const fraction = originalIndex - index;
    
    if (index < audioData.length - 1) {
      resampled[i] = audioData[index] * (1 - fraction) + audioData[index + 1] * fraction;
    } else {
      resampled[i] = audioData[index];
    }
  }
  
  return resampled;
}

function normalizeAudio(audioData: Float32Array): Float32Array {
  // Find the maximum amplitude
  let maxAmplitude = 0;
  for (let i = 0; i < audioData.length; i++) {
    const amplitude = Math.abs(audioData[i]);
    if (amplitude > maxAmplitude) {
      maxAmplitude = amplitude;
    }
  }
  
  // Normalize to prevent clipping
  if (maxAmplitude > 0) {
    const targetAmplitude = 0.95;
    const scale = targetAmplitude / maxAmplitude;
    
    for (let i = 0; i < audioData.length; i++) {
      audioData[i] *= scale;
    }
  }
  
  return audioData;
}

function applyNoiseReduction(audioData: Float32Array): Float32Array {
  // Simple noise reduction using a high-pass filter
  const filtered = new Float32Array(audioData.length);
  const cutoffFrequency = 80; // Hz
  const sampleRate = currentSettings.sampleRate;
  const RC = 1 / (2 * Math.PI * cutoffFrequency);
  const dt = 1 / sampleRate;
  const alpha = dt / (RC + dt);
  
  let previousOutput = 0;
  
  for (let i = 0; i < audioData.length; i++) {
    const input = audioData[i];
    const output = alpha * (input - previousOutput) + previousOutput;
    filtered[i] = output;
    previousOutput = output;
  }
  
  return filtered;
}

async function simulateWhisperInference(audioData: Float32Array): Promise<{ text: string; confidence: number }> {
  // Simulate processing time based on model size
  const processingTimes = {
    tiny: 500,
    base: 1000,
    small: 2000,
    medium: 4000,
    large: 8000
  };
  
  const processingTime = processingTimes[currentSettings.model as keyof typeof processingTimes] || 1000;
  
  // Simulate inference delay
  await new Promise(resolve => setTimeout(resolve, processingTime));
  
  // Generate mock transcription based on audio characteristics
  const transcription = generateMockTranscription(audioData);
  
  return transcription;
}

function generateMockTranscription(audioData: Float32Array): { text: string; confidence: number } {
  // Analyze audio characteristics to generate realistic mock text
  const energy = calculateAudioEnergy(audioData);
  const duration = audioData.length / currentSettings.sampleRate;
  
  // Generate text based on duration and energy
  let text = '';
  let confidence = 0.8;
  
  if (energy < 0.01) {
    // Very low energy - likely silence or very quiet speech
    text = duration > 2 ? '[Silence]' : '';
    confidence = 0.3;
  } else if (duration < 1) {
    // Short audio - single word or phrase
    const shortPhrases = [
      'Hello',
      'Yes',
      'No',
      'Thanks',
      'Okay',
      'Hi there',
      'Sure',
      'Good',
      'Great',
      'Perfect'
    ];
    text = shortPhrases[Math.floor(Math.random() * shortPhrases.length)];
    confidence = 0.7 + Math.random() * 0.2;
  } else if (duration < 3) {
    // Medium audio - short sentence
    const mediumPhrases = [
      'Welcome to our video',
      'Thank you for watching',
      'Let me explain this',
      'This is important',
      'Please subscribe',
      'Don\'t forget to like',
      'See you next time',
      'Have a great day',
      'Let\'s get started',
      'I hope this helps'
    ];
    text = mediumPhrases[Math.floor(Math.random() * mediumPhrases.length)];
    confidence = 0.8 + Math.random() * 0.15;
  } else {
    // Longer audio - longer sentence
    const longPhrases = [
      'In this tutorial, we will learn about the fundamentals of web development and how to create modern applications using the latest technologies.',
      'The key to success in any project is proper planning and execution, which requires careful consideration of all aspects.',
      'Today we\'re going to explore some amazing features that will help you improve your productivity and workflow significantly.',
      'Understanding the core concepts is essential before diving into more advanced topics and complex implementations.',
      'This comprehensive guide covers everything you need to know to get started with this powerful tool.'
    ];
    text = longPhrases[Math.floor(Math.random() * longPhrases.length)];
    confidence = 0.85 + Math.random() * 0.1;
  }
  
  // Adjust confidence based on audio quality
  const signalToNoise = estimateSignalToNoise(audioData);
  confidence *= Math.min(1, signalToNoise);
  
  return {
    text: text.trim(),
    confidence: Math.max(0.1, Math.min(0.99, confidence))
  };
}

function calculateAudioEnergy(audioData: Float32Array): number {
  let energy = 0;
  for (let i = 0; i < audioData.length; i++) {
    energy += audioData[i] * audioData[i];
  }
  return Math.sqrt(energy / audioData.length);
}

function estimateSignalToNoise(audioData: Float32Array): number {
  // Simple SNR estimation
  const signalEnergy = calculateAudioEnergy(audioData);
  
  // Estimate noise level from the quietest portions
  const sortedData = [...audioData].sort((a, b) => Math.abs(a) - Math.abs(b));
  const noiseSamples = sortedData.slice(0, Math.floor(sortedData.length * 0.1));
  const noiseEnergy = Math.sqrt(
    noiseSamples.reduce((sum, sample) => sum + sample * sample, 0) / noiseSamples.length
  );
  
  if (noiseEnergy === 0) return 1;
  
  const snr = signalEnergy / noiseEnergy;
  return Math.min(1, snr / 10); // Normalize to 0-1 range
}

// Export for testing
export { 
  initialize, 
  loadModel, 
  transcribeAudio, 
  preprocessAudio, 
  simulateWhisperInference 
};
