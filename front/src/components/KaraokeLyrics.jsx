import { useEffect, useRef } from 'react';

const KaraokeLyrics = ({ recognizedWords, currentTime }) => {
  const containerRef = useRef(null);
  
  // Auto-scroll to keep recent words visible
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [recognizedWords]);
  
  return (
    <div 
      ref={containerRef}
      className="bg-gradient-to-br from-slate-800/50 to-purple-900/30 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-xl overflow-y-auto max-h-40"
    >
      <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
        <span className="text-2xl">🎵</span>
        Recognized Lyrics
      </h3>
      
      {recognizedWords.length === 0 ? (
        <p className="text-gray-400 text-center py-4 italic">
          Start singing to see your lyrics appear here...
        </p>
      ) : (
        <div className="flex flex-wrap gap-2 items-center">
          {recognizedWords.map((wordData, index) => {
            // Calculate how recent this word is
            const age = currentTime - wordData.time;
            const isRecent = age < 1; // Last second
            const isCurrent = age < 0.3; // Last 300ms
            
            return (
              <span
                key={index}
                className={`
                  inline-block px-3 py-2 rounded-lg font-medium transition-all duration-300
                  ${isCurrent 
                    ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white text-2xl scale-110 shadow-lg shadow-pink-500/50' 
                    : isRecent
                    ? 'bg-cyan-500/30 text-cyan-200 text-xl border border-cyan-400/50'
                    : 'bg-white/10 text-gray-300 text-lg'
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
  );
};

export default KaraokeLyrics;
