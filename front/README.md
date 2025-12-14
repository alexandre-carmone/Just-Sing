# Just Sing - Pitch Perfect Game 🎤

A beautiful browser-based singing game where you match your voice pitch with a song in real-time!

## Features

- 🎵 Real-time pitch detection and visualization
- 🎨 Beautiful gradient UI with Tailwind CSS
- 🔊 WebSocket streaming to backend for pitch analysis
- 📊 Dual-line visualization (your voice vs. song pitch)
- 🏆 Live scoring system
- ⚡ Built with React + Vite for fast performance

## Setup

1. **Install dependencies:**
   ```bash
   cd front
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   Navigate to `http://localhost:3000`

## How It Works

1. **Microphone Input**: Captures your voice in real-time using the Web Audio API
2. **WebSocket Streaming**: Streams audio data to your backend (BentoML) at `ws://localhost:8000/ws`
3. **Pitch Visualization**: Draws two lines:
   - **Cyan line**: The target song pitch (known in advance)
   - **Pink line**: Your real-time voice pitch (from backend analysis)
4. **Scoring**: Points are awarded based on how closely your pitch matches the song

## Backend Integration

The frontend expects a WebSocket server at `ws://localhost:8000/ws` that:
- Receives audio chunks (webm/opus format)
- Analyzes the pitch using your BentoML model
- Sends back JSON responses: `{ "pitch": <number> }`

You can adjust the WebSocket URL in [src/hooks/useAudioStreaming.js](src/hooks/useAudioStreaming.js).

## Customization

### Change Song Pitch Data
Edit the `SAMPLE_SONG_PITCHES` array in [src/App.jsx](src/App.jsx) to use your actual song data.

### Adjust Pitch Range
The visualizer assumes a pitch range of 0-1000. Modify the normalization in [src/components/PitchVisualizer.jsx](src/components/PitchVisualizer.jsx) if your pitch values are different.

### Styling
All colors and gradients can be customized in the Tailwind config or component files.

## Build for Production

```bash
npm run build
```

The optimized production build will be in the `dist/` folder.

## Technologies Used

- **React 18**: UI framework
- **Vite**: Fast build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **Web Audio API**: Microphone access
- **WebSocket**: Real-time communication with backend
- **Canvas API**: High-performance pitch visualization

## License

MIT
