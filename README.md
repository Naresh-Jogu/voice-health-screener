# Voice Health Screener

AI-powered voice-based preliminary health intake application.

The application conducts a short voice conversation with a user, collects basic health-intake information, and generates a structured preliminary health report.

> ⚠️ This application is for preliminary health intake only. It does not provide medical diagnosis or treatment.

---

## Features

- 🎙️ Voice-based health screening
- 🤖 AI-powered conversational intake
- 📝 Speech-to-text transcription
- 🔊 AI-generated voice responses
- 🔇 Automatic silence detection
- 📋 Structured health information extraction
- 📊 Preliminary health report generation
- 🔌 Real-time WebSocket communication
- 🌐 Responsive React interface
- 🌍 Support for multilingual voice input where supported by the AI services

---

## Tech Stack

### Frontend

- React
- Vite
- JavaScript
- WebSocket API
- MediaRecorder API
- Web Audio API
- CSS

### Backend

- Node.js
- Express.js
- WebSocket (`ws`)

### AI / Voice Services

- Groq LLM
- Sarvam AI Speech-to-Text
- Text-to-Speech service

---

## Architecture

```text
                    ┌──────────────────┐
                    │      User        │
                    │  Voice / Audio   │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ React Frontend   │
                    │                  │
                    │ MediaRecorder    │
                    │ Web Audio API    │
                    │ WebSocket        │
                    └────────┬─────────┘
                             │
                             │ WebSocket
                             ▼
                    ┌──────────────────┐
                    │ Node.js Backend  │
                    │                  │
                    │ Call Handler     │
                    └────────┬─────────┘
                             │
             ┌───────────────┼────────────────┐
             │               │                │
             ▼               ▼                ▼
       ┌──────────┐    ┌──────────┐    ┌──────────┐
       │   STT    │    │   LLM    │    │   TTS    │
       │          │    │          │    │          │
       │ Audio →  │    │ Generate │    │ Text →   │
       │ Text     │    │ Response │    │ Audio    │
       └──────────┘    └──────────┘    └──────────┘
             │               │                │
             └───────────────┼────────────────┘
                             ▼
                    ┌──────────────────┐
                    │ Health Report    │
                    │ Generator        │
                    └──────────────────┘


voice-health-screener/
│
├── client/
│   ├── src/
│   │   ├── hooks/
│   │   │   ├── useAudioRecorder.js
│   │   │   └── useWebSocket.js
│   │   │
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── main.jsx
│   │
│   └── package.json
│
├── server/
│   ├── src/
│   │   ├── config/
│   │   │   └── env.js
│   │   │
│   │   ├── services/
│   │   │   ├── intakeService.js
│   │   │   ├── llmService.js
│   │   │   ├── reportService.js
│   │   │   ├── sttService.js
│   │   │   └── ttsService.js
│   │   │
│   │   ├── websocket/
│   │   │   └── callHandler.js
│   │   │
│   │   └── server.js
│   │
│   └── package.json
│
└── README.md
```
