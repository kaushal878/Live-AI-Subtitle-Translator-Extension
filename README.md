# Live AI Subtitle Translator

A production-level Chromium-based browser extension for YouTube that provides real-time subtitle translation and AI-powered live captions with ultra-low latency.

## Features

### 🎯 Core Features
- **Automatic Subtitle Detection**: Detects existing YouTube subtitles automatically
- **Real-time Translation**: Instant translation with <1 second delay
- **AI Live Captions**: Whisper AI-powered transcription when subtitles unavailable
- **Smooth Subtitle Overlay**: Modern, draggable, resizable overlay UI
- **Dual Subtitle Mode**: Display original and translated subtitles simultaneously
- **Multi-language Support**: 20+ languages including English, Nepali, Hindi, Japanese, Korean, Chinese, Arabic, Spanish, French, German

### 🚀 Advanced Features
- **Smart Fallback System**: Native → Auto-generated → AI transcription
- **Export Functionality**: SRT, TXT, VTT export formats
- **Keyboard Shortcuts**: Quick toggle and language switching
- **Customizable Styling**: Font size, colors, position, opacity
- **Performance Optimization**: Web Workers, streaming processing, caching
- **Browser Compatibility**: Brave Browser and Chrome support

## Installation

### Prerequisites
- Node.js 16+ and npm/yarn
- Chrome or Brave browser
- Git (for cloning)

### Quick Install

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/live-ai-subtitle-translator.git
   cd live-ai-subtitle-translator
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the extension**
   ```bash
   npm run build
   ```

4. **Load in browser**
   
   **Chrome:**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder
   
   **Brave:**
   - Open `brave://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

### Development Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start development server**
   ```bash
   npm run dev
   ```

3. **Load the extension** (use the `dist` folder as above)

4. **Watch for changes** - Webpack will automatically rebuild

## Usage

### Basic Usage

1. **Visit YouTube** - Navigate to any YouTube video
2. **Enable Subtitles** - Click the extension icon and toggle subtitles
3. **Select Language** - Choose your target translation language
4. **Enjoy** - Watch real-time translated subtitles!

### Keyboard Shortcuts

- `Alt+S` - Toggle subtitles on/off
- `Alt+L` - Switch target language
- `Alt+T` - Start/stop AI transcription
- `Alt+↑/↓` - Move subtitle position
- `Alt+Plus/Minus` - Increase/decrease font size

### Settings

Access settings through the extension popup:

- **General**: Enable/disable features, dual subtitle mode
- **Translation**: Source/target languages, translation provider
- **Style**: Font size, colors, position, opacity
- **AI**: Whisper model, quality settings, live transcription

## Configuration

### Translation Providers

#### LibreTranslate (Free)
- Default option, no API key required
- Uses public LibreTranslate instances
- Good for basic translation needs

#### OpenRouter (API Key Required)
- High-quality AI translations
- Supports advanced language models
- Requires API key from OpenRouter

#### Google Translate (API Key Required)
- Enterprise-grade translations
- Requires Google Cloud API key
- Best accuracy and reliability

### AI Models

Configure Whisper models based on your needs:

- **Tiny**: Fastest processing, basic accuracy
- **Base**: Balanced speed and accuracy (recommended)
- **Small**: Good accuracy, moderate speed
- **Medium**: High accuracy, slower processing
- **Large**: Best accuracy, slowest processing

### Performance Settings

- **Auto Quality Mode**: Automatically adjusts model based on device performance
- **Chunk Duration**: Audio processing chunk size (2000ms default)
- **Silence Threshold**: Minimum audio level for transcription

## Architecture

### Project Structure

```
src/
├── background/          # Service worker and background tasks
├── content/            # Content script for YouTube integration
├── popup/              # Extension popup interface
├── offscreen/          # Offscreen document for audio capture
├── components/         # React components
├── services/           # Core services (translation, transcription)
├── utils/              # Utility functions and helpers
├── types/              # TypeScript type definitions
├── hooks/              # React hooks
├── workers/            # Web Workers for AI processing
└── assets/             # Static assets
```

### Core Components

- **YouTubeSubtitleDetector**: Detects and parses YouTube subtitles
- **WhisperTranscriber**: AI-powered speech recognition
- **TranslationService**: Multi-provider translation system
- **SubtitleOverlay**: Modern UI component for subtitle display
- **ContentScript**: Main integration logic for YouTube

### Data Flow

1. **Subtitle Detection** → YouTubeSubtitleDetector
2. **Audio Capture** → Offscreen Document → Whisper Worker
3. **Translation** → TranslationService → Cache
4. **Display** → SubtitleOverlay → React Rendering

## Performance

### Optimization Features

- **Web Workers**: AI processing in background threads
- **Streaming Processing**: Real-time audio chunk processing
- **Intelligent Caching**: Translation and subtitle caching
- **Lazy Loading**: Models loaded on-demand
- **Memory Management**: Automatic cleanup and garbage collection

### Benchmarks

- **Translation Delay**: <500ms (LibreTranslate)
- **Transcription Delay**: <2s (Whisper Base model)
- **Memory Usage**: <100MB (typical usage)
- **CPU Impact**: <10% (modern devices)

## Troubleshooting

### Common Issues

**Extension not loading**
- Check Developer mode is enabled
- Verify `dist` folder contains all files
- Check browser console for errors

**Subtitles not appearing**
- Ensure YouTube has subtitles or enable AI transcription
- Check if extension is enabled for YouTube
- Verify microphone permissions for AI transcription

**Translation not working**
- Check internet connection
- Verify translation provider settings
- Try switching translation providers

**Performance issues**
- Reduce Whisper model size
- Enable Auto Quality Mode
- Close unused browser tabs

### Debug Mode

Enable debug logging:
1. Open extension popup
2. Go to Settings → Advanced
3. Enable "Debug Mode"
4. Check browser console for detailed logs

## Development

### Building

```bash
# Development build
npm run dev

# Production build
npm run build

# Clean build artifacts
npm run clean

# Type checking
npm run type-check
```

### Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

### Code Quality

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Guidelines

- Follow TypeScript best practices
- Use meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Keep code clean and readable

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/your-username/live-ai-subtitle-translator/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/live-ai-subtitle-translator/discussions)
- **Email**: support@example.com

## Changelog

### v1.0.0 (2024-05-08)
- Initial release
- Core subtitle detection and translation
- AI-powered live transcription
- Modern UI with drag/resize functionality
- Multi-language support
- Export functionality
- Performance optimizations

## Acknowledgments

- OpenAI Whisper for speech recognition
- LibreTranslate for free translation services
- React and Framer Motion for UI
- Tailwind CSS for styling
- Chrome Extension API for browser integration

---

**Made with ❤️ for the global YouTube community**
