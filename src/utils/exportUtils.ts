import { SubtitleCue, ExportFormat } from '@/types';

export class ExportUtils {
  /**
   * Export subtitles to SRT format
   */
  static exportToSRT(cues: SubtitleCue[], includeTranslation = false): string {
    let srtContent = '';
    
    cues.forEach((cue, index) => {
      const startTime = this.formatSRTTime(cue.startTime);
      const endTime = this.formatSRTTime(cue.endTime);
      
      srtContent += `${index + 1}\n`;
      srtContent += `${startTime} --> ${endTime}\n`;
      srtContent += cue.text;
      
      if (includeTranslation && cue.translatedText) {
        srtContent += `\n${cue.translatedText}`;
      }
      
      srtContent += '\n\n';
    });
    
    return srtContent.trim();
  }

  /**
   * Export subtitles to VTT format
   */
  static exportToVTT(cues: SubtitleCue[], includeTranslation = false): string {
    let vttContent = 'WEBVTT\n\n';
    
    cues.forEach((cue) => {
      const startTime = this.formatVTTTime(cue.startTime);
      const endTime = this.formatVTTTime(cue.endTime);
      
      vttContent += `${startTime} --> ${endTime}\n`;
      vttContent += cue.text;
      
      if (includeTranslation && cue.translatedText) {
        vttContent += `\n${cue.translatedText}`;
      }
      
      vttContent += '\n\n';
    });
    
    return vttContent.trim();
  }

  /**
   * Export subtitles to plain text format
   */
  static exportToTXT(cues: SubtitleCue[], includeTranslation = false, includeTimestamps = false): string {
    let textContent = '';
    
    cues.forEach((cue) => {
      if (includeTimestamps) {
        const startTime = this.formatReadableTime(cue.startTime);
        textContent += `[${startTime}] `;
      }
      
      textContent += cue.text;
      
      if (includeTranslation && cue.translatedText) {
        textContent += `\n${cue.translatedText}`;
      }
      
      textContent += '\n';
    });
    
    return textContent.trim();
  }

  /**
   * Export subtitles with custom format
   */
  static exportCustom(cues: SubtitleCue[], format: ExportFormat): string {
    switch (format.format) {
      case 'srt':
        return this.exportToSRT(cues, format.includeTranslation);
      case 'vtt':
        return this.exportToVTT(cues, format.includeTranslation);
      case 'txt':
        return this.exportToTXT(cues, format.includeTranslation, format.includeTimestamps);
      default:
        throw new Error(`Unsupported export format: ${format.format}`);
    }
  }

  /**
   * Format time for SRT (HH:MM:SS,mmm)
   */
  private static formatSRTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
  }

  /**
   * Format time for VTT (HH:MM:SS.mmm)
   */
  private static formatVTTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  }

  /**
   * Format time for readable display (MM:SS)
   */
  private static formatReadableTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Download file to user's computer
   */
  static downloadFile(content: string, filename: string, mimeType = 'text/plain') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }

  /**
   * Generate filename based on video title and current time
   */
  static generateFilename(format: string, videoTitle?: string): string {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:]/g, '-');
    const sanitizedTitle = videoTitle ? videoTitle.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-') : 'subtitles';
    
    return `${sanitizedTitle}_${timestamp}.${format}`;
  }

  /**
   * Validate and clean subtitle cues before export
   */
  static validateCues(cues: SubtitleCue[]): SubtitleCue[] {
    return cues
      .filter(cue => cue.text && cue.text.trim() && cue.startTime >= 0 && cue.endTime > cue.startTime)
      .sort((a, b) => a.startTime - b.startTime)
      .map(cue => ({
        ...cue,
        text: cue.text.trim(),
        translatedText: cue.translatedText?.trim() || undefined
      }));
  }

  /**
   * Get statistics about subtitle export
   */
  static getExportStats(cues: SubtitleCue[]): {
    totalCues: number;
    totalDuration: number;
    averageCueDuration: number;
    charactersPerCue: number;
    wordsPerCue: number;
  } {
    if (cues.length === 0) {
      return {
        totalCues: 0,
        totalDuration: 0,
        averageCueDuration: 0,
        charactersPerCue: 0,
        wordsPerCue: 0
      };
    }

    const totalDuration = cues[cues.length - 1].endTime - cues[0].startTime;
    const totalCharacters = cues.reduce((sum, cue) => sum + cue.text.length, 0);
    const totalWords = cues.reduce((sum, cue) => sum + cue.text.split(/\s+/).length, 0);

    return {
      totalCues: cues.length,
      totalDuration,
      averageCueDuration: totalDuration / cues.length,
      charactersPerCue: totalCharacters / cues.length,
      wordsPerCue: totalWords / cues.length
    };
  }
}
