# Team 11 - Just Sing

![Just Sing Banner](https://img.shields.io/badge/Just%20Sing-Karaoke%20Game-purple?style=for-the-badge&logo=music)

## 👥 Team Members

- **CARMONE Alexandre**
- **HAURET Julien**
- **VIN CHARLES**

---

## 🎤 Project Description

**Just Sing** is the Just Dance of karaoke! A real-time singing game that tracks both your pitch accuracy and lyric recognition as you perform your favorite songs. Whether you're practicing to improve your vocal skills or competing with friends in multiplayer mode, Just Sing makes singing fun and engaging.

### Key Features

- 🎵 **Real-time Pitch Tracking** - See your voice visualized alongside the target melody
- 📝 **Lyrics Recognition** - Live transcription of what you're singing
- 📖 **Ground Truth Lyrics Display** - Know exactly what to sing and when
- 🎯 **Scoring System** - Earn points based on pitch accuracy
- 🎭 **Demo Mode** - Simulated performance for presentations
- 🎨 **Beautiful UI** - Gradient animations and karaoke-style word highlighting
- 👥 **Multiplayer Ready** - Compete with friends (singer tracking with diart integration)

---

## 🏗️ Technical Architecture

### Frontend
- **Framework:** React 18.3.1 with Vite
- **Styling:** Tailwind CSS 3.4.17
- **Audio Processing:** Web Audio API (24kHz sample rate, 2048 buffer size)
- **Real-time Communication:** WebSocket connections (3 separate endpoints)
- **Visualization:** HTML5 Canvas for pitch curve display

### Backend
- **Framework:** BentoML + FastAPI (Python)
- **Pitch Detection:** CREPE model for accurate frequency extraction
- **Speech-to-Text:** Gradium's STT API for real-time transcription
- **Speaker Diarization:** diart integration with pyannote/embeddings
- **Architecture:** Microservices with async WebSocket orchestration

### WebSocket Endpoints
1. `/ws/pitch` - Real-time pitch extraction from audio stream
2. `/ws/transcription` - Live speech-to-text recognition
3. `/ws/ground_truth` - Synchronized lyrics delivery based on song timeline

---

## 🚀 Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- Python 3.10+
- uv (Python package manager)

### Backend Setup

```bash
cd Just-Sing/back_sing

# Install dependencies
uv sync

# Start the BentoML server
uv run bentoml serve app.py
```

The backend will run on `http://localhost:3000`

### Frontend Setup

```bash
cd Just-Sing/front

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will run on `http://localhost:5173`

---

## 🎮 How to Play

1. **Open the application** in your browser at `http://localhost:5173`

2. **Toggle Mock Mode** (optional) - For demo purposes without singing
   - Click the "🎤 Mock: OFF" button to enable simulated singing

3. **Start Singing**
   - Click "🎤 Start Singing"
   - Wait for the 3-second countdown
   - Sing along with the displayed lyrics!

4. **Watch Your Performance**
   - **Cyan line** = Target pitch (the song)
   - **Pink line** = Your voice in real-time
   - **Blue box** = Expected lyrics (what you should sing)
   - **Purple box** = Recognized lyrics (what you actually sang)

5. **Earn Points**
   - Within 50 Hz of target: **+10 points**
   - Within 100 Hz of target: **+5 points**

6. **Reset** to try again or switch modes

---

## 🔧 Technical Details

### Audio Processing Pipeline

```
Microphone → Web Audio API → Float32 Buffer (2048 samples)
                                    ↓
                    ┌───────────────┼───────────────┐
                    ↓               ↓               ↓
            Pitch WebSocket  Transcription  Ground Truth
                    ↓               ↓               ↓
            CREPE Model     Gradium STT     Time-synced
                    ↓               ↓          Lyrics
            Frequency Hz    Recognized      Expected
                    ↓          Words           Words
                    ↓               ↓               ↓
                    └───────────────┴───────────────┘
                                    ↓
                        Real-time Visualization
```

### Key Technologies

- **CREPE (Convolutional Representation for Pitch Estimation)**
  - Sample rate: 24,000 Hz
  - Chunk size: 80ms
  - High accuracy monophonic pitch tracking

- **React Components**
  - `PitchVisualizer.jsx` - Canvas-based scrolling pitch display
  - `KaraokeLyrics.jsx` - Animated word-by-word lyrics
  - `useAudioStreaming.js` - Custom hook for WebSocket + Web Audio integration
  - `useGroundTruth.js` - Custom hook for synchronized lyrics

- **Async WebSocket Architecture**
  - Non-blocking concurrent processing
  - Independent pitch and transcription streams
  - Efficient resource management with proper cleanup

---

## 📊 Project Structure

```
Just-Sing/
├── back_sing/               # Python Backend
│   ├── app.py              # Main BentoML service with WebSocket endpoints
│   ├── pitch_extractor.py  # CREPE pitch detection model
│   ├── transcription.py    # Gradium STT integration
│   ├── transcription.json  # Ground truth lyrics data
│   └── pyproject.toml      # Python dependencies
│
└── front/                   # React Frontend
    ├── src/
    │   ├── App.jsx                    # Main game component
    │   ├── components/
    │   │   ├── PitchVisualizer.jsx   # Canvas pitch visualization
    │   │   └── KaraokeLyrics.jsx     # Lyrics display
    │   ├── hooks/
    │   │   ├── useAudioStreaming.js  # Audio + WebSocket integration
    │   │   └── useGroundTruth.js     # Lyrics synchronization
    │   └── sample_song_pitch.js      # Reference pitch data
    ├── package.json
    └── vite.config.js
```

---

## 🎥 Demo Video

Watch our demo: [Just Sing Demo](https://mega.nz/file/FlcGhYBA#4NSPpEW16uwupWY-ao854dFILZyo0Nubu9scEJpwHas)

---

## 💻 GitHub Repository

[https://github.com/alexandre-carmone/Just-Sing/tree/develop](https://github.com/alexandre-carmone/Just-Sing/tree/develop)

---

## 🌟 Features Implemented

- [x] Real-time pitch extraction and visualization
- [x] Speech-to-text transcription
- [x] Ground truth lyrics synchronization
- [x] Dual-column karaoke display (expected vs recognized)
- [x] Scoring system based on pitch accuracy
- [x] 3-second countdown before recording
- [x] Mock mode for demonstrations
- [x] Auto-scrolling lyrics containers
- [x] Deduplication of repeated lyrics
- [x] Connection status indicators
- [x] Responsive gradient UI with animations
- [x] Dynamic pitch range normalization
- [x] Optimized audio buffer management

---

## 🔮 Future Enhancements

- [ ] Song library with multiple tracks
- [ ] Multiplayer competitive mode
- [ ] Leaderboard and score history
- [ ] Custom song upload
- [ ] Difficulty levels
- [ ] Voice effects and filters
- [ ] Mobile-responsive design

---

## 📝 License

This project was created for a hackathon. All rights reserved by the team members.

---

## 🙏 Acknowledgments

- **CREPE** for pitch detection
- **Gradium** for STT API
- **pyannote** for speaker embeddings
- **BentoML** for ML model serving
- **React** and **Vite** for the frontend framework

---

**Made with ❤️ and 🎵 by Team 11**
