import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { ExtensionSettings, DEFAULT_SETTINGS, SUPPORTED_LANGUAGES } from '@/types';

// Chrome types
declare const chrome: any;

const Popup: React.FC = () => {
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'translation' | 'style' | 'ai'>('general');

  useEffect(() => {
    loadSettings();
    checkTranscriptionStatus();
  }, []);

  const loadSettings = async () => {
    try {
      const result = await chrome.storage.sync.get('settings');
      if (result.settings) {
        setSettings({ ...DEFAULT_SETTINGS, ...result.settings });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkTranscriptionStatus = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.id && tab.url?.includes('youtube.com')) {
        const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_TRANSCRIPTION_STATUS' });
        setIsTranscribing(response?.isTranscribing || false);
      }
    } catch (error) {
      // Content script might not be loaded
    }
  };

  const updateSettings = async (newSettings: Partial<ExtensionSettings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);
      await chrome.storage.sync.set({ settings: updatedSettings });

      // Notify content script
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.id && tab.url?.includes('youtube.com')) {
        chrome.tabs.sendMessage(tab.id, { 
          type: 'UPDATE_SETTINGS', 
          payload: newSettings 
        });
      }
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  };

  const toggleTranscription = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.id && tab.url?.includes('youtube.com')) {
        const response = await chrome.tabs.sendMessage(tab.id, { 
          type: isTranscribing ? 'STOP_TRANSCRIPTION' : 'START_TRANSCRIPTION' 
        });
        setIsTranscribing(response?.success ? !isTranscribing : isTranscribing);
      }
    } catch (error) {
      console.error('Failed to toggle transcription:', error);
    }
  };

  const toggleSubtitles = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.id && tab.url?.includes('youtube.com')) {
        const response = await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_SUBTITLES' });
        updateSettings({ enabled: response?.enabled });
      }
    } catch (error) {
      console.error('Failed to toggle subtitles:', error);
    }
  };

  const exportSubtitles = async (format: 'srt' | 'txt' | 'vtt') => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.id && tab.url?.includes('youtube.com')) {
        const response = await chrome.tabs.sendMessage(tab.id, { 
          type: 'EXPORT_SUBTITLES', 
          payload: { format, includeTranslation: true, includeTimestamps: true } 
        });
        
        if (response?.data) {
          downloadFile(response.data, `subtitles.${format}`);
        }
      }
    } catch (error) {
      console.error('Failed to export subtitles:', error);
    }
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="w-80 h-96 flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-gray-900 text-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-lg font-bold text-blue-400">Live AI Subtitle Translator</h1>
        <p className="text-xs text-gray-400 mt-1">Real-time YouTube subtitles</p>
      </div>

      {/* Quick Actions */}
      <div className="p-4 space-y-2">
        <button
          onClick={toggleSubtitles}
          className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
            settings.enabled 
              ? 'bg-green-600 hover:bg-green-700' 
              : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          {settings.enabled ? 'Subtitles ON' : 'Subtitles OFF'}
        </button>

        <button
          onClick={toggleTranscription}
          className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
            isTranscribing 
              ? 'bg-red-600 hover:bg-red-700' 
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isTranscribing ? 'Stop AI Transcription' : 'Start AI Transcription'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        {(['general', 'translation', 'style', 'ai'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 px-2 text-xs font-medium capitalize transition-colors ${
              activeTab === tab 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-4 max-h-64 overflow-y-auto">
        {activeTab === 'general' && (
          <div className="space-y-4">
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) => updateSettings({ enabled: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Enable subtitles</span>
              </label>
            </div>

            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.dualSubtitleMode}
                  onChange={(e) => updateSettings({ dualSubtitleMode: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Dual subtitle mode</span>
              </label>
            </div>

            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.autoDetectLanguage}
                  onChange={(e) => updateSettings({ autoDetectLanguage: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Auto-detect language</span>
              </label>
            </div>
          </div>
        )}

        {activeTab === 'translation' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Source Language</label>
              <select
                value={settings.translation.sourceLanguage}
                onChange={(e) => updateSettings({ 
                  translation: { ...settings.translation, sourceLanguage: e.target.value }
                })}
                className="w-full px-3 py-1 bg-gray-800 border border-gray-700 rounded text-sm"
              >
                <option value="auto">Auto-detect</option>
                {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Target Language</label>
              <select
                value={settings.translation.targetLanguage}
                onChange={(e) => updateSettings({ 
                  translation: { ...settings.translation, targetLanguage: e.target.value }
                })}
                className="w-full px-3 py-1 bg-gray-800 border border-gray-700 rounded text-sm"
              >
                {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Translation Provider</label>
              <select
                value={settings.translation.translationProvider}
                onChange={(e) => updateSettings({ 
                  translation: { ...settings.translation, translationProvider: e.target.value as any }
                })}
                className="w-full px-3 py-1 bg-gray-800 border border-gray-700 rounded text-sm"
              >
                <option value="libretranslate">LibreTranslate (Free)</option>
                <option value="openrouter">OpenRouter (API Key Required)</option>
                <option value="google">Google Translate (API Key Required)</option>
              </select>
            </div>
          </div>
        )}

        {activeTab === 'style' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Font Size</label>
              <input
                type="range"
                min="12"
                max="32"
                value={settings.subtitleStyle.fontSize}
                onChange={(e) => updateSettings({ 
                  subtitleStyle: { ...settings.subtitleStyle, fontSize: parseInt(e.target.value) }
                })}
                className="w-full"
              />
              <span className="text-xs text-gray-400">{settings.subtitleStyle.fontSize}px</span>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Opacity</label>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.subtitleStyle.opacity * 100}
                onChange={(e) => updateSettings({ 
                  subtitleStyle: { ...settings.subtitleStyle, opacity: parseInt(e.target.value) / 100 }
                })}
                className="w-full"
              />
              <span className="text-xs text-gray-400">{Math.round(settings.subtitleStyle.opacity * 100)}%</span>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Position</label>
              <select
                value={settings.subtitleStyle.position}
                onChange={(e) => updateSettings({ 
                  subtitleStyle: { ...settings.subtitleStyle, position: e.target.value as any }
                })}
                className="w-full px-3 py-1 bg-gray-800 border border-gray-700 rounded text-sm"
              >
                <option value="bottom">Bottom</option>
                <option value="top">Top</option>
                <option value="center">Center</option>
              </select>
            </div>
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="space-y-4">
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.ai.enableLiveTranscription}
                  onChange={(e) => updateSettings({ 
                    ai: { ...settings.ai, enableLiveTranscription: e.target.checked }
                  })}
                  className="rounded"
                />
                <span className="text-sm">Enable live transcription</span>
              </label>
            </div>

            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.ai.autoQualityMode}
                  onChange={(e) => updateSettings({ 
                    ai: { ...settings.ai, autoQualityMode: e.target.checked }
                  })}
                  className="rounded"
                />
                <span className="text-sm">Auto quality mode</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Whisper Model</label>
              <select
                value={settings.ai.whisperModel}
                onChange={(e) => updateSettings({ 
                  ai: { ...settings.ai, whisperModel: e.target.value as any }
                })}
                className="w-full px-3 py-1 bg-gray-800 border border-gray-700 rounded text-sm"
              >
                <option value="tiny">Tiny (Fastest)</option>
                <option value="base">Base (Balanced)</option>
                <option value="small">Small (Good)</option>
                <option value="medium">Medium (Better)</option>
                <option value="large">Large (Best)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Export Section */}
      <div className="p-4 border-t border-gray-700">
        <p className="text-xs font-medium mb-2">Export Subtitles</p>
        <div className="flex gap-2">
          <button
            onClick={() => exportSubtitles('srt')}
            className="flex-1 py-1 px-2 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors"
          >
            SRT
          </button>
          <button
            onClick={() => exportSubtitles('txt')}
            className="flex-1 py-1 px-2 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors"
          >
            TXT
          </button>
          <button
            onClick={() => exportSubtitles('vtt')}
            className="flex-1 py-1 px-2 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors"
          >
            VTT
          </button>
        </div>
      </div>
    </div>
  );
};

// Initialize popup
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<Popup />);
}

export default Popup;
