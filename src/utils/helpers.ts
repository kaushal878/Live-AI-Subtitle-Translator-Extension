/**
 * Utility functions and helpers for the Live AI Subtitle Translator extension
 */

export class Helpers {
  /**
   * Debounce function to limit function calls
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: any;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  /**
   * Throttle function to limit function calls
   */
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * Deep clone an object
   */
  static deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
    if (obj instanceof Array) return obj.map(item => this.deepClone(item)) as unknown as T;
    if (typeof obj === 'object') {
      const clonedObj = {} as T;
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          clonedObj[key] = this.deepClone(obj[key]);
        }
      }
      return clonedObj;
    }
    return obj;
  }

  /**
   * Generate a unique ID
   */
  static generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  /**
   * Format file size in human readable format
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Format duration in seconds to human readable format
   */
  static formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  }

  /**
   * Sanitize text for display
   */
  static sanitizeText(text: string): string {
    return text
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .trim();
  }

  /**
   * Extract YouTube video ID from URL
   */
  static extractYouTubeVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }

    return null;
  }

  /**
   * Check if a string is empty or only whitespace
   */
  static isEmpty(str: string | null | undefined): boolean {
    return !str || str.trim().length === 0;
  }

  /**
   * Truncate text to specified length
   */
  static truncateText(text: string, maxLength: number, suffix = '...'): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - suffix.length) + suffix;
  }

  /**
   * Check if browser supports required features
   */
  static checkBrowserSupport(): {
    webAssembly: boolean;
    mediaDevices: boolean;
    audioContext: boolean;
    webWorkers: boolean;
    chromeExtension: boolean;
  } {
    return {
      webAssembly: typeof WebAssembly === 'object',
      mediaDevices: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      audioContext: !!(window.AudioContext || (window as any).webkitAudioContext),
      webWorkers: typeof Worker !== 'undefined',
      chromeExtension: typeof (globalThis as any).chrome !== 'undefined' && !!(globalThis as any).chrome?.runtime
    };
  }

  /**
   * Get browser information
   */
  static getBrowserInfo(): {
    name: string;
    version: string;
    isChrome: boolean;
    isBrave: boolean;
    isEdge: boolean;
  } {
    const userAgent = navigator.userAgent;
    
    return {
      name: this.getBrowserName(userAgent),
      version: this.getBrowserVersion(userAgent),
      isChrome: userAgent.includes('Chrome') && !userAgent.includes('Edg'),
      isBrave: userAgent.includes('Brave'),
      isEdge: userAgent.includes('Edg')
    };
  }

  private static getBrowserName(userAgent: string): string {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  private static getBrowserVersion(userAgent: string): string {
    const match = userAgent.match(/(?:Chrome|Firefox|Safari|Edge)\/(\d+)/);
    return match ? match[1] : 'Unknown';
  }

  /**
   * Convert RGB to Hex color
   */
  static rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }

  /**
   * Convert Hex to RGB color
   */
  static hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  /**
   * Calculate contrast ratio between two colors
   */
  static getContrastRatio(color1: string, color2: string): number {
    const rgb1 = this.hexToRgb(color1);
    const rgb2 = this.hexToRgb(color2);
    
    if (!rgb1 || !rgb2) return 0;
    
    const luminance1 = this.getLuminance(rgb1.r, rgb1.g, rgb1.b);
    const luminance2 = this.getLuminance(rgb2.r, rgb2.g, rgb2.b);
    
    const lighter = Math.max(luminance1, luminance2);
    const darker = Math.min(luminance1, luminance2);
    
    return (lighter + 0.05) / (darker + 0.05);
  }

  private static getLuminance(r: number, g: number, b: number): number {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  /**
   * Sleep function for async delays
   */
  static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry function with exponential backoff
   */
  static async retry<T>(
    fn: () => Promise<T>,
    maxAttempts = 3,
    delay = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxAttempts) {
          throw lastError;
        }
        
        await this.sleep(delay * Math.pow(2, attempt - 1));
      }
    }
    
    throw lastError!;
  }

  /**
   * Cache implementation with TTL
   */
  static createCache<T>(ttlMs = 60000): {
    get: (key: string) => T | undefined;
    set: (key: string, value: T) => void;
    clear: () => void;
    has: (key: string) => boolean;
  } {
    const cache = new Map<string, { value: T; timestamp: number }>();
    
    return {
      get(key: string): T | undefined {
        const item = cache.get(key);
        if (!item) return undefined;
        
        if (Date.now() - item.timestamp > ttlMs) {
          cache.delete(key);
          return undefined;
        }
        
        return item.value;
      },
      
      set(key: string, value: T): void {
        cache.set(key, { value, timestamp: Date.now() });
      },
      
      clear(): void {
        cache.clear();
      },
      
      has(key: string): boolean {
        return this.get(key) !== undefined;
      }
    };
  }

  /**
   * Event emitter for custom events
   */
  static createEventEmitter(): {
    on: (event: string, callback: (...args: any[]) => void) => void;
    off: (event: string, callback: (...args: any[]) => void) => void;
    emit: (event: string, ...args: any[]) => void;
  } {
    const events = new Map<string, Set<(...args: any[]) => void>>();
    
    return {
      on(event: string, callback: (...args: any[]) => void): void {
        if (!events.has(event)) {
          events.set(event, new Set());
        }
        events.get(event)!.add(callback);
      },
      
      off(event: string, callback: (...args: any[]) => void): void {
        const callbacks = events.get(event);
        if (callbacks) {
          callbacks.delete(callback);
        }
      },
      
      emit(event: string, ...args: any[]): void {
        const callbacks = events.get(event);
        if (callbacks) {
          callbacks.forEach(callback => callback(...args));
        }
      }
    };
  }
}
