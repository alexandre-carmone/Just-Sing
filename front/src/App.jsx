import { useState, useEffect, useRef } from 'react';
import PitchVisualizer from './components/PitchVisualizer';
import KaraokeLyrics from './components/KaraokeLyrics';
import useAudioStreaming from './hooks/useAudioStreaming';
import useGroundTruth from './hooks/useGroundTruth';
import SAMPLE_SONG_PITCHES from './sample_song_pitch';

const SONG_DURATION = 20; // total song duration in seconds

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [singerPitches, setSingerPitches] = useState([]);
  const [score, setScore] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [recognizedWords, setRecognizedWords] = useState([]);
  const [groundTruthWords, setGroundTruthWords] = useState([]);
  const [countdown, setCountdown] = useState(null);
  const startTimeRef = useRef(null);
  const groundTruthContainerRef = useRef(null);
  
const handlePitchReceived = (pitch) => {
    console.log('🎵 Received - Pitch:', pitch, 'Type:', typeof pitch);
    
    const now = (Date.now() - startTimeRef.current) / 1000; // time in seconds
    
    setSingerPitches(prev => {
      const newPitch = { time: now, pitch: Number(pitch) };
      console.log('💾 Storing pitch:', newPitch);
      const newPitches = [...prev, newPitch];
      // Keep pitches from the last 5 seconds
      const cutoffTime = now - 5;
      return newPitches.filter(p => p.time >= cutoffTime);
    });
    
    // Calculate score based on pitch accuracy at current time
    const targetPitch = SAMPLE_SONG_PITCHES.find(
      sp => Math.abs(sp.time - now) < 0.1
    );
    if (targetPitch) {
      const difference = Math.abs(Number(pitch) - targetPitch.pitch);
      // Award points if within 50 Hz of target pitch
      if (difference < 50) {
        setScore(prev => prev + 10);
      } else if (difference < 100) {
        setScore(prev => prev + 5);
      }
    }
  };
  
  const handleWordReceived = (word) => {
    console.log('💬 Received - Word:', word);
    
    const now = (Date.now() - startTimeRef.current) / 1000; // time in seconds
    
    // Add recognized word if provided
    if (word) {
      setRecognizedWords(prev => {
        const newWord = { time: now, word };
        const newWords = [...prev, newWord];
        // Keep words from the last 10 seconds
        const cutoffTime = now - 10;
        return newWords.filter(w => w.time >= cutoffTime);
      });
    }
  };
  
  const handleGroundTruthReceived = (data) => {
    console.log('📖 Received - Ground Truth:', data.text);
    
    // Add ground truth word with deduplication
    if (data.text) {
      setGroundTruthWords(prev => {
        // Check if this exact word at this exact expected time already exists
        const isDuplicate = prev.some(
          w => w.word === data.text && Math.abs(w.time - data.expectedTime) < 0.01
        );
        
        // Skip if duplicate
        if (isDuplicate) {
          console.log('⏭️ Skipping duplicate:', data.text);
          return prev;
        }
        
        const newWord = { 
          time: data.expectedTime, 
          word: data.text,
          actualTime: data.actualTime,
          timeDifference: data.timeDifference
        };
        const newWords = [...prev, newWord];
        // Keep words from the last 15 seconds
        const cutoffTime = data.actualTime - 15;
        return newWords.filter(w => w.time >= cutoffTime);
      });
    }
  };
  
  const { isPitchConnected, isTranscriptionConnected, isConnected, error } = useAudioStreaming(
    isRecording, 
    handlePitchReceived,
    handleWordReceived
  );
  
  const { isConnected: isGroundTruthConnected, error: groundTruthError } = useGroundTruth(
    isRecording,
    handleGroundTruthReceived
  );
  
  // Auto-scroll ground truth lyrics to bottom
  useEffect(() => {
    if (groundTruthContainerRef.current) {
      groundTruthContainerRef.current.scrollTop = groundTruthContainerRef.current.scrollHeight;
    }
  }, [groundTruthWords]);
  
  // Animation loop for time progression
  useEffect(() => {
    if (!isRecording) {
      setCurrentTime(0); // Reset current time when not recording
      return;
    }
    
    startTimeRef.current = Date.now();
    
    const animationFrame = () => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      setCurrentTime(elapsed);
      
      // Stop when song ends
      if (elapsed < SONG_DURATION) {
        requestAnimationFrame(animationFrame);
      } else {
        setIsRecording(false);
      }
    };
    
    const frameId = requestAnimationFrame(animationFrame);
    
    return () => cancelAnimationFrame(frameId);
  }, [isRecording]);
  
  const toggleRecording = () => {
    if (isRecording || countdown !== null) {
      // Stop recording or cancel countdown
      setIsRecording(false);
      setCountdown(null);
    } else {
      // Start countdown before recording
      setSingerPitches([]);
      setRecognizedWords([]);
      setGroundTruthWords([]);
      setScore(0);
      setCurrentTime(0);
      
      // Start 3 second countdown
      setCountdown(3);
      
      const countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev === 1) {
            clearInterval(countdownInterval);
            setCountdown(null);
            setIsRecording(true);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };
  
  const resetGame = () => {
    setIsRecording(false);
    setCountdown(null);
    setSingerPitches([]);
    setRecognizedWords([]);
    setGroundTruthWords([]);
    setScore(0);
    setCurrentTime(0);
    startTimeRef.current = null; // Reset the start time ref
  };
  
  // Debug function to test lyrics display
  const addTestWord = () => {
    const testWords = ['Hello', 'World', 'Just', 'Sing', 'Along', 'Music', 'Love', 'Song'];
    const randomWord = testWords[Math.floor(Math.random() * testWords.length)];
    const now = (Date.now() - (startTimeRef.current || Date.now())) / 1000;
    
    setRecognizedWords(prev => [...prev, { time: now, word: randomWord }]);
    if (!startTimeRef.current) {
      startTimeRef.current = Date.now();
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 mb-4">
          Just Sing
        </h1>
        <p className="text-xl text-gray-300">
          Match the pitch to win! Sing along and watch your voice flow.
        </p>
      </div>
      
      {/* Score & Time Display */}
      <div className="mb-6 flex gap-4">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl px-8 py-4 border border-white/20">
          <p className="text-3xl font-bold text-white">
            Score: <span className="text-cyan-400">{score}</span>
          </p>
        </div>
        <div className="bg-white/10 backdrop-blur-md rounded-2xl px-8 py-4 border border-white/20">
          <p className="text-3xl font-bold text-white">
            Time: <span className="text-purple-400">{currentTime.toFixed(1)}s</span> / {SONG_DURATION}s
          </p>
        </div>
      </div>
      
      {/* Countdown Overlay */}
      {countdown !== null && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center">
            <div className="text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 animate-pulse mb-4">
              {countdown}
            </div>
            <p className="text-2xl text-white font-semibold">Get ready to sing!</p>
          </div>
        </div>
      )}
      
      {/* Karaoke Lyrics Display - Dual Column */}
      <div className="w-full max-w-7xl mb-6 grid grid-cols-2 gap-4">
        {/* Ground Truth (Expected) Lyrics */}
        <div ref={groundTruthContainerRef} className="bg-gradient-to-br from-blue-800/50 to-indigo-900/30 backdrop-blur-md rounded-2xl p-6 border border-blue-400/20 shadow-xl overflow-y-auto max-h-40">
          <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <span className="text-2xl">📖</span>
            Expected Lyrics
          </h3>
          
          {groundTruthWords.length === 0 ? (
            <p className="text-gray-400 text-center py-4 italic">
              Start singing to see the lyrics...
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 items-center">
              {groundTruthWords.map((wordData, index) => {
                const age = currentTime - wordData.time;
                const isRecent = age >= -0.5 && age < 1; // Show just before and just after
                const isCurrent = age >= -0.2 && age < 0.3; // Currently should be sung
                
                return (
                  <span
                    key={index}
                    className={`
                      inline-block px-3 py-2 rounded-lg font-medium transition-all duration-300
                      ${isCurrent 
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-2xl scale-110 shadow-lg shadow-blue-500/50' 
                        : isRecent
                        ? 'bg-blue-500/30 text-blue-200 text-xl border border-blue-400/50'
                        : 'bg-white/10 text-gray-400 text-base'
                      }
                    `}
                    style={{
                      animation: isCurrent ? 'pulse 0.5s ease-in-out infinite' : 'none'
                    }}
                  >
                    {wordData.word}
                  </span>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Recognized Lyrics */}
        <KaraokeLyrics 
          recognizedWords={recognizedWords}
          currentTime={currentTime}
        />
      </div>
      
      {/* Visualizer Container */}
      <div className="w-full max-w-7xl mb-8 bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10 shadow-2xl">
        {/* Legend */}
        <div className="flex justify-center gap-8 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-1 bg-cyan-500 rounded shadow-lg shadow-cyan-500/50"></div>
            <span className="text-white text-sm font-medium">Song Pitch</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-1 bg-pink-500 rounded shadow-lg shadow-pink-500/50"></div>
            <span className="text-white text-sm font-medium">Your Voice</span>
          </div>
        </div>
        
        {/* Canvas Visualizer */}
        <div className="aspect-[3/1] bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl overflow-hidden border border-white/10">
          <PitchVisualizer 
            singerPitches={singerPitches}
            songPitches={SAMPLE_SONG_PITCHES}
            isRecording={isRecording}
            currentTime={currentTime}
            songDuration={SONG_DURATION}
          />
        </div>
      </div>
      
      {/* Connection Status */}
      {error && (
        <div className="mb-4 bg-red-500/20 border border-red-500 rounded-lg px-6 py-3 backdrop-blur-sm">
          <p className="text-red-200">⚠️ {error}</p>
        </div>
      )}
      
      {isRecording && (!isPitchConnected || !isTranscriptionConnected || !isGroundTruthConnected) && (
        <div className="mb-4 bg-yellow-500/20 border border-yellow-500 rounded-lg px-6 py-3 backdrop-blur-sm">
          <p className="text-yellow-200">
            🔄 Connecting... 
            {isPitchConnected ? ' ✓ Pitch' : ' ⏳ Pitch'}
            {isTranscriptionConnected ? ' ✓ Transcription' : ' ⏳ Transcription'}
            {isGroundTruthConnected ? ' ✓ Lyrics' : ' ⏳ Lyrics'}
          </p>
        </div>
      )}
      
      {isRecording && isPitchConnected && isTranscriptionConnected && isGroundTruthConnected && (
        <div className="mb-4 bg-green-500/20 border border-green-500 rounded-lg px-6 py-3 backdrop-blur-sm">
          <p className="text-green-200">✓ All Connected - Ready to sing!</p>
        </div>
      )}
      
      {/* Controls */}
      <div className="flex gap-4">
        <button
          onClick={toggleRecording}
          className={`px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-2xl ${
            isRecording || countdown !== null
              ? 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white'
              : 'bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-white'
          }`}
        >
          {countdown !== null ? `⏱️ Cancel (${countdown})` : isRecording ? '🎤 Stop Singing' : '🎤 Start Singing'}
        </button>
        
        <button
          onClick={resetGame}
          className="px-8 py-4 rounded-xl font-bold text-lg bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm border border-white/20 transition-all duration-300 transform hover:scale-105 shadow-2xl"
        >
          🔄 Reset
        </button>
        
        {/* <button
          onClick={addTestWord}
          className="px-8 py-4 rounded-xl font-bold text-lg bg-orange-500/80 hover:bg-orange-600 text-white backdrop-blur-sm border border-orange-400/20 transition-all duration-300 transform hover:scale-105 shadow-2xl"
        >
          🧪 Test Word
        </button> */}
      </div>
      
      {/* Instructions */}
      <div className="mt-8 bg-white/5 backdrop-blur-md rounded-2xl p-6 max-w-2xl border border-white/10">
        <h3 className="text-xl font-bold text-white mb-3">How to Play:</h3>
        <ul className="text-gray-300 space-y-2">
          <li>• Click "Start Singing" to begin</li>
          <li>• The <span className="text-cyan-400">cyan line</span> shows the target pitch you need to match</li>
          <li>• The <span className="text-pink-400">pink line</span> shows your voice pitch in real-time</li>
          <li>• Try to match your voice with the song pitch to score points!</li>
          <li>• The closer you match, the more points you earn</li>
        </ul>
      </div>
    </div>
  );
}

export default App;
