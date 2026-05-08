import { TranslationResult, TranslationSettings, LanguageCode } from '@/types';

export class TranslationService {
  private cache: Map<string, TranslationResult> = new Map();
  private settings: TranslationSettings;
  private translationQueue: Array<{
    text: string;
    from: string;
    to: string;
    resolve: (result: TranslationResult) => void;
    reject: (error: Error) => void;
  }> = [];
  private isProcessing = false;

  constructor(settings: TranslationSettings) {
    this.settings = settings;
  }

  public async translateText(text: string, from?: string, to?: string): Promise<TranslationResult> {
    const sourceLang = from || this.settings.sourceLanguage;
    const targetLang = to || this.settings.targetLanguage;

    // Check cache first
    const cacheKey = this.getCacheKey(text, sourceLang, targetLang);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Skip if source and target are the same
    if (sourceLang === targetLang) {
      const result: TranslationResult = {
        originalText: text,
        translatedText: text,
        sourceLanguage: sourceLang,
        targetLanguage: targetLang,
        confidence: 1.0,
        processingTime: 0
      };
      this.cache.set(cacheKey, result);
      return result;
    }

    // Add to queue and process
    return new Promise((resolve, reject) => {
      this.translationQueue.push({
        text,
        from: sourceLang,
        to: targetLang,
        resolve,
        reject
      });
      
      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  private async processQueue() {
    if (this.isProcessing || this.translationQueue.length === 0) return;
    
    this.isProcessing = true;

    while (this.translationQueue.length > 0) {
      const batch = this.translationQueue.splice(0, 5); // Process in batches of 5
      
      try {
        const results = await this.processBatch(batch);
        results.forEach((result, index) => {
          const item = batch[index];
          const cacheKey = this.getCacheKey(item.text, item.from, item.to);
          this.cache.set(cacheKey, result);
          item.resolve(result);
        });
      } catch (error) {
        batch.forEach(item => {
          item.reject(error as Error);
        });
      }
    }

    this.isProcessing = false;
  }

  private async processBatch(batch: Array<{
    text: string;
    from: string;
    to: string;
  }>): Promise<TranslationResult[]> {
    switch (this.settings.translationProvider) {
      case 'libretranslate':
        return this.translateWithLibreTranslate(batch);
      case 'openrouter':
        return this.translateWithOpenRouter(batch);
      case 'google':
        return this.translateWithGoogle(batch);
      default:
        throw new Error(`Unsupported translation provider: ${this.settings.translationProvider}`);
    }
  }

  private async translateWithLibreTranslate(batch: Array<{
    text: string;
    from: string;
    to: string;
  }>): Promise<TranslationResult[]> {
    const endpoint = this.settings.endpoint || 'https://libretranslate.de/translate';
    
    const promises = batch.map(async (item) => {
      const startTime = Date.now();
      
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            q: item.text,
            source: item.from === 'auto' ? 'auto' : item.from,
            target: item.to,
            format: 'text',
            api_key: this.settings.apiKey
          })
        });

        if (!response.ok) {
          throw new Error(`Translation request failed: ${response.status}`);
        }

        const data = await response.json();
        const processingTime = Date.now() - startTime;

        return {
          originalText: item.text,
          translatedText: data.translatedText,
          sourceLanguage: item.from,
          targetLanguage: item.to,
          confidence: data.confidence || 0.8,
          processingTime
        };
      } catch (error) {
        // Return fallback result
        return {
          originalText: item.text,
          translatedText: item.text, // Fallback to original text
          sourceLanguage: item.from,
          targetLanguage: item.to,
          confidence: 0,
          processingTime: Date.now() - startTime
        };
      }
    });

    return Promise.all(promises);
  }

  private async translateWithOpenRouter(batch: Array<{
    text: string;
    from: string;
    to: string;
  }>): Promise<TranslationResult[]> {
    if (!this.settings.apiKey) {
      throw new Error('OpenRouter API key is required');
    }

    const endpoint = 'https://openrouter.ai/api/v1/chat/completions';
    
    const promises = batch.map(async (item) => {
      const startTime = Date.now();
      
      try {
        const prompt = this.createTranslationPrompt(item.text, item.from, item.to);
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.settings.apiKey}`,
            'HTTP-Referer': window.location.origin,
            'X-Title': 'Live AI Subtitle Translator'
          },
          body: JSON.stringify({
            model: 'anthropic/claude-3-haiku',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 200,
            temperature: 0.3
          })
        });

        if (!response.ok) {
          throw new Error(`OpenRouter request failed: ${response.status}`);
        }

        const data = await response.json();
        const translatedText = data.choices?.[0]?.message?.content || item.text;
        const processingTime = Date.now() - startTime;

        return {
          originalText: item.text,
          translatedText: translatedText.trim(),
          sourceLanguage: item.from,
          targetLanguage: item.to,
          confidence: 0.9, // OpenRouter models typically have high quality
          processingTime
        };
      } catch (error) {
        return {
          originalText: item.text,
          translatedText: item.text,
          sourceLanguage: item.from,
          targetLanguage: item.to,
          confidence: 0,
          processingTime: Date.now() - startTime
        };
      }
    });

    return Promise.all(promises);
  }

  private async translateWithGoogle(batch: Array<{
    text: string;
    from: string;
    to: string;
  }>): Promise<TranslationResult[]> {
    // This would require Google Translate API setup
    // For now, return fallback implementation
    console.warn('Google Translate not implemented, using fallback');
    
    return batch.map(item => ({
      originalText: item.text,
      translatedText: item.text,
      sourceLanguage: item.from,
      targetLanguage: item.to,
      confidence: 0,
      processingTime: 0
    }));
  }

  private createTranslationPrompt(text: string, from: string, to: string): string {
    const languageNames = {
      en: 'English',
      ne: 'Nepali',
      hi: 'Hindi',
      ja: 'Japanese',
      ko: 'Korean',
      zh: 'Chinese',
      ar: 'Arabic',
      es: 'Spanish',
      fr: 'French',
      de: 'German'
    };

    const sourceLang = languageNames[from as keyof typeof languageNames] || from;
    const targetLang = languageNames[to as keyof typeof languageNames] || to;

    return `Translate the following text from ${sourceLang} to ${targetLang}. Only return the translated text, no explanations:

${text}`;
  }

  private getCacheKey(text: string, from: string, to: string): string {
    return `${text}:${from}:${to}`;
  }

  public updateSettings(settings: Partial<TranslationSettings>) {
    this.settings = { ...this.settings, ...settings };
  }

  public clearCache() {
    this.cache.clear();
  }

  public getCacheSize(): number {
    return this.cache.size;
  }

  public async detectLanguage(text: string): Promise<string> {
    // Simple language detection based on character patterns
    // In a production environment, you'd use a proper language detection library
    
    const patterns = {
      ne: '[\u0900-\u097F]', // Devanagari script (Nepali, Hindi)
      ja: '[\u3040-\u309F\u30A0-\u30FF]', // Japanese Hiragana/Katakana
      ko: '[\uAC00-\uD7AF]', // Korean Hangul
      zh: '[\u4E00-\u9FFF]', // Chinese characters
      ar: '[\u0600-\u06FF]', // Arabic
      ru: '[\u0400-\u04FF]', // Cyrillic
      th: '[\u0E00-\u0E7F]', // Thai
    };

    for (const [lang, pattern] of Object.entries(patterns)) {
      if (new RegExp(pattern).test(text)) {
        return lang;
      }
    }

    // Default to English if no specific pattern detected
    return 'en';
  }

  public getSupportedLanguages(): LanguageCode[] {
    return [
      'en', 'ne', 'hi', 'ja', 'ko', 'zh', 'ar', 'es', 'fr', 'de',
      'ru', 'pt', 'it', 'nl', 'sv', 'da', 'no', 'fi', 'pl', 'tr'
    ];
  }

  public isLanguageSupported(language: string): boolean {
    return this.getSupportedLanguages().includes(language as LanguageCode);
  }
}
