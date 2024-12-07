# Text-to-Speech Narrator Application

A desktop application that provides text-to-speech narration capabilities with character management and audio control features.

## Features

- Text-to-Speech (TTS) narration
- Character management system
- Audio control and playback
- Script management
- Queue management for TTS requests
- User interface with toast notifications

## Project Structure

```
├── app/
│   ├── App.js             # Main application logic
│   ├── config.js          # Application configuration
│   └── EventEmitter.js    # Event handling system
├── managers/
│   ├── audioController.js    # Audio playback control
│   ├── characterManager.js   # Character management
│   ├── databaseManager.js    # Data persistence
│   ├── scriptManager.js      # Script handling
│   ├── ttsQueueManager.js    # TTS queue management
│   └── uiManager.js          # UI management
├── utils/
│   └── toastManager.js       # Toast notification system
└── audio_cache/              # Cache directory for audio files
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the application:
```bash
npm start
```

Or use the provided startup scripts:
- `start.bat` - Main startup script
- `start-narrator.bat` - Narrator-specific startup
