// Offscreen document for audio capture and processing
// This runs in an offscreen document to handle audio capture API

// Chrome types
declare const chrome: any;

class OffscreenService {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private isCapturing = false;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    // Setup message listener
    chrome.runtime.onMessage.addListener((message: any, sender: any, sendResponse: Function) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async response
    });

    console.log('Offscreen document initialized');
  }

  private async handleMessage(message: any, sender: any, sendResponse: Function) {
    try {
      switch (message.type) {
        case 'START_AUDIO_CAPTURE':
          const streamId = await this.startAudioCapture();
          sendResponse({ streamId });
          break;

        case 'STOP_AUDIO_CAPTURE':
          this.stopAudioCapture();
          sendResponse({ success: true });
          break;

        case 'GET_AUDIO_STREAM':
          const stream = await this.getAudioStream();
          sendResponse({ stream });
          break;

        default:
          sendResponse({ error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Offscreen message handling error:', error);
      sendResponse({ error: (error as Error).message });
    }
  }

  private async startAudioCapture(): Promise<string> {
    try {
      if (this.isCapturing) {
        throw new Error('Audio capture already in progress');
      }

      // Get tab audio stream
      const streamId = await this.getTabAudioStream();
      
      if (!streamId) {
        throw new Error('Failed to get tab audio stream');
      }

      // Get the actual MediaStream
      this.mediaStream = await this.getMediaStreamFromId(streamId);
      
      if (!this.mediaStream) {
        throw new Error('Failed to create MediaStream from stream ID');
      }

      // Setup audio processing
      this.setupAudioProcessing();

      this.isCapturing = true;
      console.log('Audio capture started');
      
      return streamId;
    } catch (error) {
      console.error('Failed to start audio capture:', error);
      throw error;
    }
  }

  private stopAudioCapture() {
    if (!this.isCapturing) return;

    // Stop audio processing
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    this.isCapturing = false;
    console.log('Audio capture stopped');
  }

  private async getTabAudioStream(): Promise<string | null> {
    try {
      // Request tab capture from background script
      const response = await chrome.runtime.sendMessage({
        type: 'CAPTURE_AUDIO'
      });

      return response.streamId || null;
    } catch (error) {
      console.error('Failed to get tab audio stream:', error);
      return null;
    }
  }

  private async getMediaStreamFromId(streamId: string): Promise<MediaStream | null> {
    try {
      // In a real implementation, this would convert the stream ID to a MediaStream
      // For now, we'll create a mock stream
      const mockStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      });
      
      return mockStream;
    } catch (error) {
      console.error('Failed to get MediaStream from ID:', error);
      return null;
    }
  }

  private setupAudioProcessing() {
    if (!this.mediaStream) return;

    this.audioContext = new AudioContext({
      sampleRate: 16000
    });

    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (event) => {
      if (!this.isCapturing) return;

      const inputData = event.inputBuffer.getChannelData(0);
      const audioData = new Float32Array(inputData);

      // Send audio data to main thread for processing
      chrome.runtime.sendMessage({
        type: 'AUDIO_CHUNK',
        payload: {
          audioData: audioData.buffer,
          sampleRate: this.audioContext!.sampleRate,
          timestamp: Date.now()
        }
      }, [audioData.buffer]);
    };

    source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
  }

  private async getAudioStream(): Promise<MediaStream | null> {
    return this.mediaStream;
  }

  public destroy() {
    this.stopAudioCapture();
  }
}

// Initialize the offscreen service
const offscreenService = new OffscreenService();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  offscreenService.destroy();
});

export default OffscreenService;
