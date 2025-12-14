import { useState, useEffect, useRef, useCallback } from 'react';

// const WEBSOCKET_BASE_URL = 'ws://10.0.1.137:3000/sing';
const WEBSOCKET_BASE_URL = 'ws://10.0.1.176:3000/sing';
// const WEBSOCKET_BASE_URL = 'ws://localhost:3000/sing';
const PITCH_WS_URL = `${WEBSOCKET_BASE_URL}/ws/pitch`;
const TRANSCRIPTION_WS_URL = `${WEBSOCKET_BASE_URL}/ws/transcription`;

const useAudioStreaming = (isRecording, onPitchReceived, onWordReceived) => {
  const [isPitchConnected, setIsPitchConnected] = useState(false);
  const [isTranscriptionConnected, setIsTranscriptionConnected] = useState(false);
  const [error, setError] = useState(null);
  
  const pitchWsRef = useRef(null);
  const transcriptionWsRef = useRef(null);
  const audioContextRef = useRef(null);
  const streamRef = useRef(null);
  const processorRef = useRef(null);
  const sourceRef = useRef(null);
  
  // Store callbacks in refs to avoid useEffect re-runs
  const onPitchReceivedRef = useRef(onPitchReceived);
  const onWordReceivedRef = useRef(onWordReceived);
  
  // Update refs when callbacks change
  useEffect(() => {
    onPitchReceivedRef.current = onPitchReceived;
    onWordReceivedRef.current = onWordReceived;
  }, [onPitchReceived, onWordReceived]);
  
  useEffect(() => {
    if (!isRecording) {
      cleanup();
      return;
    }
    
    const setupAudioStreaming = async () => {
      try {
        // Request microphone access
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 24000
          }
        });
        streamRef.current = stream;
        
        // Set up Web Audio API
        const audioContext = new (window.AudioContext || window.webkitAudioContext)({
          sampleRate: 24000
        });
        audioContextRef.current = audioContext;
        
        const source = audioContext.createMediaStreamSource(stream);
        sourceRef.current = source;
        
        // ============ PITCH WEBSOCKET ============
        console.log('🔌 Connecting to pitch WebSocket:', PITCH_WS_URL);
        const pitchWs = new WebSocket(PITCH_WS_URL);
        pitchWsRef.current = pitchWs;
        
        pitchWs.onopen = () => {
          console.log('✅ Pitch WebSocket connected');
          setIsPitchConnected(true);
          setError(null);
        };
        
        pitchWs.onmessage = (event) => {
          console.log('📊 Pitch WebSocket received:', event.data);
          try {
            const data = JSON.parse(event.data);
            if (data.pitch !== undefined) {
              console.log('🎵 Received pitch:', data.pitch);
              onPitchReceivedRef.current(data.pitch);
            }
          } catch (err) {
            console.error('❌ Error parsing pitch message:', err);
          }
        };
        
        pitchWs.onerror = (err) => {
          console.error('❌ Pitch WebSocket error:', err);
          setError('Pitch connection error');
        };
        
        pitchWs.onclose = () => {
          console.log('⚠️ Pitch WebSocket disconnected');
          setIsPitchConnected(false);
        };
        
        // ============ TRANSCRIPTION WEBSOCKET ============
        console.log('🔌 Connecting to transcription WebSocket:', TRANSCRIPTION_WS_URL);
        const transcriptionWs = new WebSocket(TRANSCRIPTION_WS_URL);
        transcriptionWsRef.current = transcriptionWs;
        
        transcriptionWs.onopen = () => {
          console.log('✅ Transcription WebSocket connected');
          setIsTranscriptionConnected(true);
          setError(null);
        };
        
        transcriptionWs.onmessage = (event) => {
          console.log('📝 Transcription WebSocket received:', event.data);
          try {
            const data = JSON.parse(event.data);
            if (data.word !== undefined) {
              console.log('💬 Received word:', data.word);
              onWordReceivedRef.current(data.word);
            }
          } catch (err) {
            console.error('❌ Error parsing transcription message:', err);
          }
        };
        
        transcriptionWs.onerror = (err) => {
          console.error('❌ Transcription WebSocket error:', err);
          setError('Transcription connection error');
        };
        
        transcriptionWs.onclose = () => {
          console.log('⚠️ Transcription WebSocket disconnected');
          setIsTranscriptionConnected(false);
        };
        
        // ============ SINGLE AUDIO PROCESSOR (optimized) ============
        // Use smaller buffer for lower latency: 2048 samples = ~85ms at 24kHz (must be power of 2)
        const bufferSize = 2048;
        const processor = audioContext.createScriptProcessor(bufferSize, 1, 1);
        processorRef.current = processor;
        
        processor.onaudioprocess = (e) => {
          const inputData = e.inputBuffer.getChannelData(0);
          const audioBuffer = inputData.buffer;
          
          // Send to pitch WebSocket if open
          if (pitchWs.readyState === WebSocket.OPEN) {
            pitchWs.send(audioBuffer.slice(0)); // Send copy
            if (Math.random() < 0.02) {
              console.log('🎤 Sent to pitch endpoint');
            }
          }
          
          // Send to transcription WebSocket if open
          if (transcriptionWs.readyState === WebSocket.OPEN) {
            transcriptionWs.send(audioBuffer.slice(0)); // Send copy
            if (Math.random() < 0.02) {
              console.log('📝 Sent to transcription endpoint');
            }
          }
        };
        
        source.connect(processor);
        processor.connect(audioContext.destination);
        
      } catch (err) {
        console.error('Error setting up audio streaming:', err);
        setError(err.message);
      }
    };
    
    setupAudioStreaming();
    
    return cleanup;
  }, [isRecording]); // Only depend on isRecording, callbacks are handled via refs
  
  const cleanup = () => {
    console.log('🧹 Cleaning up audio streaming...');
    
    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch (err) {
        console.warn('Error disconnecting processor:', err);
      }
      processorRef.current = null;
    }
    
    if (sourceRef.current) {
      try {
        sourceRef.current.disconnect();
      } catch (err) {
        console.warn('Error disconnecting source:', err);
      }
      sourceRef.current = null;
    }
    
    if (pitchWsRef.current && pitchWsRef.current.readyState !== WebSocket.CLOSED) {
      try {
        pitchWsRef.current.close();
      } catch (err) {
        console.warn('Error closing pitch WebSocket:', err);
      }
    }
    
    if (transcriptionWsRef.current && transcriptionWsRef.current.readyState !== WebSocket.CLOSED) {
      try {
        transcriptionWsRef.current.close();
      } catch (err) {
        console.warn('Error closing transcription WebSocket:', err);
      }
    }
    
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach(track => track.stop());
      } catch (err) {
        console.warn('Error stopping stream tracks:', err);
      }
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch (err) {
        console.warn('Error closing audio context:', err);
      }
    }
    
    setIsPitchConnected(false);
    setIsTranscriptionConnected(false);
  };
  
  return { 
    isPitchConnected, 
    isTranscriptionConnected,
    isConnected: isPitchConnected || isTranscriptionConnected,
    error 
  };
};

export default useAudioStreaming;
