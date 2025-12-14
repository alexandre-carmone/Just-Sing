import { useEffect, useRef } from 'react';

const PitchVisualizer = ({ singerPitches, songPitches, isRecording, currentTime, songDuration }) => {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#1e1b4b');
    gradient.addColorStop(1, '#0f172a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Grid lines
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = (height / 5) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    // Define visible time window (show 3 seconds: 1 second past, 2 seconds ahead)
    const timeWindow = 3; // seconds
    const pastWindow = 1; // seconds to show behind current time
    const startTime = Math.max(0, currentTime - pastWindow);
    const endTime = startTime + timeWindow;
    
    // Helper function to convert time to x position
    const timeToX = (time) => {
      return ((time - startTime) / timeWindow) * width;
    };
    
    // Helper function to convert pitch to y position
    const pitchToY = (pitch) => {
      // Calculate min/max from all available pitches for better visualization
      const allPitches = [
        ...songPitches.map(p => p.pitch),
        ...singerPitches.map(p => p.pitch)
      ];
      
      const minPitch = allPitches.length > 0 ? Math.min(...allPitches) * 0.8 : 50;
      const maxPitch = allPitches.length > 0 ? Math.max(...allPitches) * 1.2 : 500;
      
      return height - ((pitch - minPitch) / (maxPitch - minPitch)) * height;
    };
    
    // Draw current time indicator (vertical line)
    const currentX = timeToX(currentTime);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(currentX, 0);
    ctx.lineTo(currentX, height);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw song pitch line (reference)
    if (songPitches.length > 0) {
      ctx.strokeStyle = '#14b8a6';
      ctx.lineWidth = 4;
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#14b8a6';
      ctx.beginPath();
      
      let pathStarted = false;
      songPitches.forEach((pitchData) => {
        if (pitchData.time >= startTime && pitchData.time <= endTime) {
          const x = timeToX(pitchData.time);
          const y = pitchToY(pitchData.pitch);
          
          if (!pathStarted) {
            ctx.moveTo(x, y);
            pathStarted = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      
      if (pathStarted) {
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      
      // Draw dots on the song pitch line for better visibility
      ctx.fillStyle = '#14b8a6';
      songPitches.forEach((pitchData) => {
        if (pitchData.time >= startTime && pitchData.time <= endTime) {
          const x = timeToX(pitchData.time);
          const y = pitchToY(pitchData.pitch);
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }
    
    // Draw singer's pitch line
    if (singerPitches.length > 0) {
      console.log('🎨 Drawing singer pitches:', singerPitches.length, 'pitches');
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 4;
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ec4899';
      ctx.beginPath();
      
      let pathStarted = false;
      const sortedPitches = [...singerPitches].sort((a, b) => a.time - b.time);
      
      let drawnCount = 0;
      sortedPitches.forEach((pitchData) => {
        if (pitchData.time >= startTime && pitchData.time <= endTime) {
          const x = timeToX(pitchData.time);
          const y = pitchToY(pitchData.pitch);
          drawnCount++;
          
          if (!pathStarted) {
            ctx.moveTo(x, y);
            pathStarted = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      
      console.log(`🎨 Drew ${drawnCount} out of ${sortedPitches.length} singer pitches in visible window`);
      
      if (pathStarted) {
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      
      // Draw current position indicator
      if (isRecording && singerPitches.length > 0) {
        const lastPitch = sortedPitches[sortedPitches.length - 1];
        if (lastPitch && lastPitch.time >= startTime && lastPitch.time <= endTime) {
          const x = timeToX(lastPitch.time);
          const y = pitchToY(lastPitch.pitch);
          
          ctx.fillStyle = '#ec4899';
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#ec4899';
          ctx.beginPath();
          ctx.arc(x, y, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
    }
    
    // Draw time labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    for (let t = Math.ceil(startTime); t <= Math.floor(endTime); t++) {
      const x = timeToX(t);
      ctx.fillText(`${t}s`, x, height - 5);
    }
    
  }, [singerPitches, songPitches, isRecording, currentTime, songDuration]);
  
  return (
    <canvas
      ref={canvasRef}
      width={1200}
      height={400}
      className="w-full h-full rounded-lg shadow-2xl"
    />
  );
};

export default PitchVisualizer;
