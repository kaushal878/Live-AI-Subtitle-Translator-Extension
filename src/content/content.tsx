import React from 'react';
import { createRoot } from 'react-dom/client';
import { YouTubeSubtitleDetector } from '@/services/youtubeSubtitleDetector';
import { WhisperTranscriber } from '@/services/whisperTranscriber';
import { TranslationService } from '@/services/translationService';
import { SubtitleOverlay } from '@/components/SubtitleOverlay';
import { 
  ExtensionSettings, 
  SubtitleCue, 
  TranscriptionResult, 
  TranslationResult,
  DEFAULT_SETTINGS 
} from '@/types';

class ContentScript {
  private settings: ExtensionSettings;
  private subtitleDetector!: YouTubeSubtitleDetector;
  private whisperTranscriber!: WhisperTranscriber;
  private translationService!: TranslationService;
  private currentCues: SubtitleCue[] = [];
  private translatedCues: SubtitleCue[] = [];
  private overlayContainer: HTMLElement | null = null;
  private overlayRoot: any = null;
  private isInitialized = false;

  constructor() {
    this.settings = { ...DEFAULT_SETTINGS };
    this.initializeServices();
    this.loadSettings();
    this.setupMessageListener();
  }

  private async initializeServices() {
    // Initialize YouTube subtitle detector
    this.subtitleDetector = new YouTubeSubtitleDetector();
    this.subtitleDetector.setSubtitleDetectionCallback((track) => {
      this.handleSubtitleDetection(track);
    });

    // Initialize Whisper transcriber
    this.whisperTranscriber = new WhisperTranscriber(this.settings.ai);
    this.whisperTranscriber.setTranscriptionCallback((result) => {
      this.handleTranscriptionResult(result);
    });

    // Initialize translation service
    this.translationService = new TranslationService(this.settings.translation);
  }

  private async loadSettings() {
    try {
      const stored = await chrome.storage.sync.get('settings');
      if (stored.settings) {
        this.settings = { ...DEFAULT_SETTINGS, ...stored.settings };
        this.updateServiceSettings();
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  private updateServiceSettings() {
    this.whisperTranscriber.updateSettings(this.settings.ai);
    this.translationService.updateSettings(this.settings.translation);
  }

  private setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async response
    });
  }

  private async handleMessage(message: any, sender: any, sendResponse: Function) {
    try {
      switch (message.type) {
        case 'GET_SETTINGS':
          sendResponse({ settings: this.settings });
          break;

        case 'UPDATE_SETTINGS':
          this.settings = { ...this.settings, ...message.payload };
          await chrome.storage.sync.set({ settings: this.settings });
          this.updateServiceSettings();
          this.updateOverlay();
          sendResponse({ success: true });
          break;

        case 'START_TRANSCRIPTION':
          const success = await this.whisperTranscriber.startTranscription();
          sendResponse({ success });
          break;

        case 'STOP_TRANSCRIPTION':
          this.whisperTranscriber.stopTranscription();
          sendResponse({ success: true });
          break;

        case 'TOGGLE_SUBTITLES':
          this.settings.enabled = !this.settings.enabled;
          await chrome.storage.sync.set({ settings: this.settings });
          this.updateOverlay();
          sendResponse({ enabled: this.settings.enabled });
          break;

        default:
          sendResponse({ error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Message handling error:', error);
      sendResponse({ error: (error as Error).message });
    }
  }

  private handleSubtitleDetection(track: any) {
    if (!this.settings.enabled) return;

    this.currentCues = track.cues;
    
    // Translate subtitles if needed
    if (this.settings.translation.targetLanguage !== 'auto' && 
        this.settings.translation.targetLanguage !== track.language) {
      this.translateSubtitles(track.cues);
    } else {
      this.translatedCues = [];
      this.updateOverlay();
    }
  }

  private async translateSubtitles(cues: SubtitleCue[]) {
    const translationPromises = cues.map(async (cue) => {
      try {
        const result = await this.translationService.translateText(
          cue.text,
          cue.originalText ? 'auto' : this.settings.translation.sourceLanguage,
          this.settings.translation.targetLanguage
        );
        
        return {
          ...cue,
          translatedText: result.translatedText
        };
      } catch (error) {
        console.error('Translation error:', error);
        return cue;
      }
    });

    this.translatedCues = await Promise.all(translationPromises);
    this.updateOverlay();
  }

  private handleTranscriptionResult(result: TranscriptionResult) {
    if (!this.settings.enabled) return;

    // Convert transcription result to subtitle cue
    const cue: SubtitleCue = {
      id: `whisper-${Date.now()}`,
      startTime: result.timestamp / 1000,
      endTime: (result.timestamp + result.duration * 1000) / 1000,
      text: result.text,
      originalText: result.text,
      confidence: result.confidence
    };

    this.currentCues = [cue];
    
    // Translate if needed
    if (this.settings.translation.targetLanguage !== 'auto' && 
        this.settings.translation.targetLanguage !== 'en') {
      this.translateSubtitles([cue]);
    } else {
      this.translatedCues = [];
      this.updateOverlay();
    }
  }

  private createOverlayContainer() {
    if (this.overlayContainer) return;

    this.overlayContainer = document.createElement('div');
    this.overlayContainer.id = 'live-ai-subtitle-overlay';
    this.overlayContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 999999;
    `;
    
    document.body.appendChild(this.overlayContainer);
    if (this.overlayContainer) {
      this.overlayRoot = createRoot(this.overlayContainer);
    }
  }

  private updateOverlay() {
    if (!this.settings.enabled) {
      if (this.overlayContainer) {
        this.overlayContainer.style.display = 'none';
      }
      return;
    }

    if (!this.overlayContainer) {
      this.createOverlayContainer();
    }

    if (this.overlayContainer) {
      this.overlayContainer.style.display = 'block';
    }

    // Render the subtitle overlay
    if (this.overlayRoot) {
      this.overlayRoot.render(
        React.createElement(SubtitleOverlay, {
          cues: this.currentCues,
          translatedCues: this.translatedCues,
          style: this.settings.subtitleStyle,
          isVisible: this.settings.enabled,
          dualMode: this.settings.dualSubtitleMode,
          onPositionChange: (position: { x: number; y: number }) => {
            // Handle position changes
          },
          onSizeChange: (size: { width: number; height: number }) => {
            // Handle size changes
          }
        })
      );
    }
  }

  private setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
      const { altKey, ctrlKey, shiftKey, key } = event;
      
      // Toggle subtitles (Alt+S)
      if (altKey && key === 's') {
        event.preventDefault();
        this.settings.enabled = !this.settings.enabled;
        chrome.storage.sync.set({ settings: this.settings });
        this.updateOverlay();
      }
      
      // Switch language (Alt+L)
      if (altKey && key === 'l') {
        event.preventDefault();
        // Cycle through target languages
        const languages = ['en', 'ne', 'hi', 'ja', 'ko', 'zh', 'ar', 'es', 'fr', 'de'];
        const currentIndex = languages.indexOf(this.settings.translation.targetLanguage);
        const nextIndex = (currentIndex + 1) % languages.length;
        this.settings.translation.targetLanguage = languages[nextIndex];
        chrome.storage.sync.set({ settings: this.settings });
        this.updateServiceSettings();
        
        // Re-translate current subtitles
        if (this.currentCues.length > 0) {
          this.translateSubtitles(this.currentCues);
        }
      }
      
      // Start/stop transcription (Alt+T)
      if (altKey && key === 't') {
        event.preventDefault();
        if (this.whisperTranscriber.isCurrentlyTranscribing()) {
          this.whisperTranscriber.stopTranscription();
        } else {
          this.whisperTranscriber.startTranscription();
        }
      }
    });
  }

  public async initialize() {
    if (this.isInitialized) return;

    // Wait for YouTube to be ready
    if (window.location.hostname.includes('youtube.com')) {
      // Start services
      if (this.settings.ai.enableLiveTranscription) {
        await this.whisperTranscriber.loadModel();
      }

      // Setup keyboard shortcuts
      this.setupKeyboardShortcuts();

      // Create overlay
      this.updateOverlay();

      this.isInitialized = true;
      console.log('Live AI Subtitle Translator initialized');
    }
  }

  public destroy() {
    if (this.overlayRoot && this.overlayContainer) {
      this.overlayRoot.unmount();
      this.overlayContainer.remove();
    }

    this.subtitleDetector.destroy();
    this.whisperTranscriber.destroy();
  }
}

// Initialize the content script
const contentScript = new ContentScript();

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    contentScript.initialize();
  });
} else {
  contentScript.initialize();
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  contentScript.destroy();
});

// Export for TypeScript
export default ContentScript;
