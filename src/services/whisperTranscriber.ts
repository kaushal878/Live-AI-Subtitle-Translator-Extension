import { TranscriptionResult, AudioChunk, AISettings } from '@/types';

// Chrome types for extension APIs
declare const chrome: any;

export class WhisperTranscriber {
  private worker: Worker | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private isTranscribing = false;
  private onTranscriptionResult?: (result: TranscriptionResult) => void;
  private settings: AISettings;
  private audioBuffer: Float32Array[] = [];
  private bufferSize = 4096;
  private sampleRate = 16000;

  constructor(settings: AISettings) {
    this.settings = settings;
    this.initializeWorker();
  }

  private initializeWorker() {
    try {
      // Create Web Worker for Whisper processing
      this.worker = new Worker(chrome.runtime.getURL('workers/whisperWorker.js'));
      
      this.worker.onmessage = (event: MessageEvent) => {
        const { type, data } = event.data;
        
        if (type === 'TRANSCRIPTION_RESULT') {
          this.handleTranscriptionResult(data);
        } else if (type === 'MODEL_LOADED') {
          console.log('Whisper model loaded successfully');
        } else if (type === 'ERROR') {
          console.error('Whisper worker error:', data);
        }
      };

      // Initialize the worker with settings
      this.worker.postMessage({
        type: 'INITIALIZE',
        payload: {
          model: this.settings.whisperModel,
          sampleRate: this.sampleRate
        }
      });
    } catch (error) {
      console.error('Failed to initialize Whisper worker:', error);
      // Fallback to Web Speech API
      this.initializeWebSpeechAPI();
    }
  }

  private initializeWebSpeechAPI() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US'; // Default language
      
      recognition.onresult = (event: any) => {
        const result = event.results[event.results.length - 1];
        if (result.isFinal) {
          this.handleTranscriptionResult({
            text: result[0].transcript,
            confidence: result[0].confidence,
            timestamp: Date.now(),
            duration: 2.0
          });
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
      };

      // Store recognition instance for later use
      (this as any).speechRecognition = recognition;
    }
  }

  public async startTranscription(): Promise<boolean> {
    if (this.isTranscribing) return true;

    try {
      // Get audio stream from tab
      const stream = await this.captureTabAudio();
      if (!stream) {
        throw new Error('Failed to capture audio stream');
      }

      this.mediaStream = stream;
      this.setupAudioProcessing(stream);
      this.isTranscribing = true;
      
      return true;
    } catch (error) {
      console.error('Failed to start transcription:', error);
      return false;
    }
  }

  public stopTranscription() {
    this.isTranscribing = false;
    
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

    if (this.worker) {
      this.worker.postMessage({ type: 'STOP_TRANSCRIPTION' });
    }

    if ((this as any).speechRecognition) {
      (this as any).speechRecognition.stop();
    }

    this.audioBuffer = [];
  }

  private async captureTabAudio(): Promise<MediaStream | null> {
    try {
      // Use Chrome's tab capture API
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) return null;

      const streamId = await new Promise<string>((resolve, reject) => {
        chrome.tabCapture.capture(
          {
            audio: true,
            video: false
          },
          (stream: any) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(stream.id);
            }
          }
        );
      });

      // Get the actual MediaStream from the stream ID
      const stream = await this.getMediaStreamFromId(streamId);
      return stream;
    } catch (error) {
      console.error('Failed to capture tab audio:', error);
      return null;
    }
  }

  private async getMediaStreamFromId(streamId: string): Promise<MediaStream> {
    // This would typically use the offscreen document approach
    // For now, we'll use a simplified approach
    return new Promise((resolve, reject) => {
      // In a real implementation, this would communicate with an offscreen document
      // to get the actual MediaStream
      reject(new Error('MediaStream from ID not implemented'));
    });
  }

  private setupAudioProcessing(stream: MediaStream) {
    this.audioContext = new AudioContext({
      sampleRate: this.sampleRate
    });

    const source = this.audioContext.createMediaStreamSource(stream);
    this.processor = this.audioContext.createScriptProcessor(this.bufferSize, 1, 1);

    this.processor.onaudioprocess = (event) => {
      if (!this.isTranscribing) return;

      const inputData = event.inputBuffer.getChannelData(0);
      const audioChunk = new Float32Array(inputData);
      
      // Add to buffer
      this.audioBuffer.push(audioChunk);
      
      // Process chunks when buffer reaches target duration
      const totalSamples = this.audioBuffer.reduce((sum, chunk) => sum + chunk.length, 0);
      const duration = totalSamples / this.sampleRate;
      
      if (duration >= this.settings.chunkDuration / 1000) {
        this.processAudioChunk();
      }
    };

    source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
  }

  private processAudioChunk() {
    if (this.audioBuffer.length === 0) return;

    // Combine all buffered audio
    const totalLength = this.audioBuffer.reduce((sum, chunk) => sum + chunk.length, 0);
    const combinedAudio = new Float32Array(totalLength);
    let offset = 0;

    for (const chunk of this.audioBuffer) {
      combinedAudio.set(chunk, offset);
      offset += chunk.length;
    }

    // Clear buffer
    this.audioBuffer = [];

    // Send to worker for processing
    if (this.worker) {
      this.worker.postMessage({
        type: 'TRANSCRIBE_AUDIO',
        payload: {
          audioData: combinedAudio.buffer,
          sampleRate: this.sampleRate,
          timestamp: Date.now()
        }
      }, [combinedAudio.buffer]);
    }
  }

  private handleTranscriptionResult(result: TranscriptionResult) {
    // Apply filtering and post-processing
    const filteredResult = this.filterTranscriptionResult(result);
    
    if (filteredResult.text.trim()) {
      this.onTranscriptionResult?.(filteredResult);
    }
  }

  private filterTranscriptionResult(result: TranscriptionResult): TranscriptionResult {
    let text = result.text.trim();
    
    // Remove common transcription artifacts
    text = text.replace(/\[.*?\]/g, ''); // Remove brackets
    text = text.replace(/\(.*?\)/g, ''); // Remove parentheses
    text = text.replace(/\s+/g, ' '); // Normalize whitespace
    
    // Filter out very short or low confidence results
    if (text.length < 2 || result.confidence < 0.3) {
      text = '';
    }

    // Apply silence threshold
    if (this.settings.silenceThreshold > 0) {
      // This would require more sophisticated audio analysis
      // For now, just check if text is meaningful
    }

    return {
      ...result,
      text
    };
  }

  public setTranscriptionCallback(callback: (result: TranscriptionResult) => void) {
    this.onTranscriptionResult = callback;
  }

  public updateSettings(settings: Partial<AISettings>) {
    this.settings = { ...this.settings, ...settings };
    
    // Update worker with new settings
    if (this.worker) {
      this.worker.postMessage({
        type: 'UPDATE_SETTINGS',
        payload: this.settings
      });
    }
  }

  public isCurrentlyTranscribing(): boolean {
    return this.isTranscribing;
  }

  public async loadModel(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.worker) {
        resolve(false);
        return;
      }

      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'MODEL_LOADED') {
          this.worker!.removeEventListener('message', handleMessage);
          resolve(true);
        } else if (event.data.type === 'ERROR') {
          this.worker!.removeEventListener('message', handleMessage);
          resolve(false);
        }
      };

      this.worker.addEventListener('message', handleMessage);
      this.worker.postMessage({ type: 'LOAD_MODEL' });
    });
  }

  public destroy() {
    this.stopTranscription();
    
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}
