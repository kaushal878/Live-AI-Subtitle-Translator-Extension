// Chrome types for extension APIs
declare const chrome: any;

import { ExtensionSettings, DEFAULT_SETTINGS } from '@/types';

class BackgroundService {
  private settings: ExtensionSettings;

  constructor() {
    this.settings = { ...DEFAULT_SETTINGS };
    this.initialize();
  }

  private async initialize() {
    // Load settings from storage
    await this.loadSettings();
    
    // Setup context menu
    this.setupContextMenu();
    
    // Setup message handlers
    this.setupMessageHandlers();
    
    // Setup tab listeners
    this.setupTabListeners();
  }

  private async loadSettings() {
    try {
      const result = await chrome.storage.sync.get('settings');
      if (result.settings) {
        this.settings = { ...DEFAULT_SETTINGS, ...result.settings };
      } else {
        // Initialize with default settings
        await chrome.storage.sync.set({ settings: this.settings });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  private setupContextMenu() {
    chrome.contextMenus.create({
      id: 'toggle-subtitles',
      title: 'Toggle AI Subtitles',
      contexts: ['page'],
      documentUrlPatterns: ['https://www.youtube.com/*', 'https://youtube.com/*']
    });

    chrome.contextMenus.create({
      id: 'settings',
      title: 'Subtitle Settings',
      contexts: ['page'],
      documentUrlPatterns: ['https://www.youtube.com/*', 'https://youtube.com/*']
    });

    chrome.contextMenus.onClicked.addListener((info: any, tab: any) => {
      switch (info.menuItemId) {
        case 'toggle-subtitles':
          this.toggleSubtitles(tab.id);
          break;
        case 'settings':
          this.openSettings(tab.id);
          break;
      }
    });
  }

  private async toggleSubtitles(tabId: number) {
    try {
      const response = await chrome.tabs.sendMessage(tabId, { type: 'TOGGLE_SUBTITLES' });
      console.log('Subtitles toggled:', response);
    } catch (error) {
      console.error('Failed to toggle subtitles:', error);
    }
  }

  private openSettings(tabId: number) {
    chrome.action.openPopup();
  }

  private setupMessageHandlers() {
    chrome.runtime.onMessage.addListener((message: any, sender: any, sendResponse: Function) => {
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
          
          // Notify all content scripts
          const tabs = await chrome.tabs.query({ url: ['https://www.youtube.com/*', 'https://youtube.com/*'] });
          tabs.forEach((tab: any) => {
            chrome.tabs.sendMessage(tab.id!, { 
              type: 'UPDATE_SETTINGS', 
              payload: message.payload 
            }).catch(() => {
              // Ignore errors for tabs that don't have content script
            });
          });
          
          sendResponse({ success: true });
          break;

        case 'CREATE_OFFSCREEN':
          await this.createOffscreenDocument();
          sendResponse({ success: true });
          break;

        case 'CAPTURE_AUDIO':
          const streamId = await this.captureTabAudio(sender.tab.id);
          sendResponse({ streamId });
          break;

        default:
          sendResponse({ error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Background message handling error:', error);
      sendResponse({ error: (error as Error).message });
    }
  }

  private setupTabListeners() {
    // Handle tab updates
    chrome.tabs.onUpdated.addListener((tabId: number, changeInfo: any, tab: any) => {
      if (changeInfo.status === 'complete' && tab.url?.includes('youtube.com')) {
        // Inject content script if needed
        this.injectContentScript(tabId);
      }
    });

    // Handle tab activation
    chrome.tabs.onActivated.addListener((activeInfo: any) => {
      chrome.tabs.get(activeInfo.tabId, (tab: any) => {
        if (tab.url?.includes('youtube.com')) {
          // Update badge based on settings
          this.updateBadge(activeInfo.tabId);
        }
      });
    });
  }

  private async injectContentScript(tabId: number) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['dist/content.js']
      });
    } catch (error) {
      console.error('Failed to inject content script:', error);
    }
  }

  private updateBadge(tabId: number) {
    const badgeText = this.settings.enabled ? 'ON' : 'OFF';
    const badgeColor = this.settings.enabled ? '#4CAF50' : '#9E9E9E';
    
    chrome.action.setBadgeText({ text: badgeText, tabId });
    chrome.action.setBadgeBackgroundColor({ color: badgeColor, tabId });
  }

  private async createOffscreenDocument() {
    // Check if offscreen document already exists
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [chrome.runtime.getURL('offscreen.html')]
    });

    if (existingContexts.length > 0) {
      return; // Offscreen document already exists
    }

    // Create offscreen document for audio processing
    await chrome.offscreen.createDocument({
      url: chrome.runtime.getURL('offscreen.html'),
      reasons: ['USER_MEDIA', 'WEB_RTC'],
      justification: 'Audio capture for AI transcription'
    });
  }

  private async captureTabAudio(tabId: number): Promise<string | null> {
    try {
      // Create offscreen document if needed
      await this.createOffscreenDocument();

      // Capture audio from the tab
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

      return streamId;
    } catch (error) {
      console.error('Failed to capture tab audio:', error);
      return null;
    }
  }

  // Handle extension installation
  private setupInstallationHandler() {
    chrome.runtime.onInstalled.addListener(async (details: any) => {
      if (details.reason === 'install') {
        // Initialize default settings
        await chrome.storage.sync.set({ settings: this.settings });
        
        // Open welcome page
        chrome.tabs.create({
          url: chrome.runtime.getURL('welcome.html')
        });
      } else if (details.reason === 'update') {
        console.log('Extension updated to version:', chrome.runtime.getManifest().version);
      }
    });
  }
}

// Initialize background service
new BackgroundService();

// Export for TypeScript
export default BackgroundService;
