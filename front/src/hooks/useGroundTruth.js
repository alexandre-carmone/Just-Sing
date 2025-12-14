import { useState, useEffect, useRef } from 'react';

// const WEBSOCKET_BASE_URL = 'ws://10.0.1.137:3000/sing';
const WEBSOCKET_BASE_URL = 'ws://10.0.1.176:3000/sing';
// const WEBSOCKET_BASE_URL = 'ws://localhost:3000/sing';
const GROUND_TRUTH_WS_URL = `${WEBSOCKET_BASE_URL}/ws/ground_truth`;

const useGroundTruth = (isRecording, onGroundTruthReceived) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const onGroundTruthReceivedRef = useRef(onGroundTruthReceived);
  
  // Update ref when callback changes1
  useEffect(() => {
    onGroundTruthReceivedRef.current = onGroundTruthReceived;
  }, [onGroundTruthReceived]);
  
  useEffect(() => {
    if (!isRecording) {
      cleanup();
      return;
    }
    
    const setupGroundTruthConnection = async () => {
      try {
        console.log('🔌 Connecting to ground truth WebSocket:', GROUND_TRUTH_WS_URL);
        const ws = new WebSocket(GROUND_TRUTH_WS_URL);
        wsRef.current = ws;
        
        ws.onopen = () => {
          console.log('✅ Ground truth WebSocket connected');
          setIsConnected(true);
          setError(null);
        };
        
        ws.onmessage = (event) => {
          console.log('📖 Ground truth WebSocket received:', event.data);
          try {
            const data = JSON.parse(event.data);
            
            // Handle initialization message
            if (data.type === 'connection_established') {
              console.log('📚 Ground truth initialized:', data.total_entries, 'entries');
              return;
            }
            
            // Handle ground truth lyrics
            if (data.type === 'ground_truth' && data.text) {
              console.log('📖 Received ground truth:', data.text, 'at', data.expected_time_s + 's');
              onGroundTruthReceivedRef.current({
                text: data.text,
                expectedTime: data.expected_time_s,
                actualTime: data.actual_relative_time_s,
                timeDifference: data.time_difference
              });
            }
          } catch (err) {
            console.error('❌ Error parsing ground truth message:', err);
          }
        };
        
        ws.onerror = (err) => {
          console.error('❌ Ground truth WebSocket error:', err);
          setError('Ground truth connection error');
        };
        
        ws.onclose = () => {
          console.log('⚠️ Ground truth WebSocket disconnected');
          setIsConnected(false);
        };
        
      } catch (err) {
        console.error('❌ Error setting up ground truth connection:', err);
        setError(err.message);
      }
    };
    
    setupGroundTruthConnection();
    
    return () => {
      cleanup();
    };
  }, [isRecording]);
  
  const cleanup = () => {
    console.log('🧹 Cleaning up ground truth connection...');
    
    try {
      if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
        wsRef.current.close();
      }
      wsRef.current = null;
    } catch (err) {
      console.error('Error during ground truth cleanup:', err);
    }
    
    setIsConnected(false);
  };
  
  return { isConnected, error };
};

export default useGroundTruth;
