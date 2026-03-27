import { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Play, Pause } from 'lucide-react';
import { Button } from './ui/button';

/**
 * WaveformPlayer Component
 * Displays audio waveform and playback controls
 */
const WaveformPlayer = ({ audioUrl, duration }) => {
  const waveformRef = useRef(null);
  const wavesurferRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (waveformRef.current && audioUrl) {
      setLoadError(false);
      // Initialize WaveSurfer
      wavesurferRef.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: '#94a3b8',
        progressColor: '#3b82f6',
        cursorColor: '#3b82f6',
        barWidth: 2,
        barRadius: 3,
        height: 40,
        normalize: true,
      });

      // Load audio
      wavesurferRef.current.load(audioUrl);

      // Event listeners
      wavesurferRef.current.on('play', () => setIsPlaying(true));
      wavesurferRef.current.on('pause', () => setIsPlaying(false));
      wavesurferRef.current.on('finish', () => setIsPlaying(false));
      wavesurferRef.current.on('audioprocess', (time) => {
        setCurrentTime(Math.floor(time));
      });
      // Fall back to native audio element on CORS / network errors
      wavesurferRef.current.on('error', () => {
        setLoadError(true);
        if (wavesurferRef.current) {
          wavesurferRef.current.destroy();
          wavesurferRef.current = null;
        }
      });

      return () => {
        if (wavesurferRef.current) {
          wavesurferRef.current.destroy();
        }
      };
    }
  }, [audioUrl]);

  const togglePlayPause = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause();
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loadError) {
    return (
      <div className="flex items-center gap-2 w-full">
        <audio
          controls
          src={audioUrl}
          className="w-full h-8"
          style={{ height: '32px' }}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 w-full">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={togglePlayPause}
        className="h-8 w-8 p-0 shrink-0"
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>
      <div className="flex-1 min-w-0">
        <div ref={waveformRef} className="w-full" />
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
        {formatTime(currentTime)} / {formatTime(duration || 0)}
      </span>
    </div>
  );
};

export default WaveformPlayer;
