import { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Play, Pause, Loader2, Volume2 } from 'lucide-react';
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
  const [isLoading, setIsLoading] = useState(true);

  // Check if URL is from a known problematic source (WhatsApp, etc.)
  const isProblematicUrl = (url) => {
    const problematicDomains = [
      'whatsapp.phone91.com',
      'media.whatsapp.com',
      'whatsapp-haptik-media'
    ];
    return problematicDomains.some(domain => url.includes(domain));
  };

  useEffect(() => {
    if (!waveformRef.current || !audioUrl) return;
    
    // Skip WaveSurfer for known problematic URLs (CORS issues)
    if (isProblematicUrl(audioUrl)) {
      setLoadError(true);
      setIsLoading(false);
      return;
    }
    
    let mounted = true;
    let loadTimeout;
    setLoadError(false);
    setIsLoading(true);
    
    // Clean up any existing instance
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
      wavesurferRef.current = null;
    }
    
    try {
      // Initialize WaveSurfer
      const wavesurfer = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: '#94a3b8',
        progressColor: '#3b82f6',
        cursorColor: '#3b82f6',
        barWidth: 2,
        barRadius: 3,
        height: 40,
        normalize: true,
        responsive: true,
        hideScrollbar: true,
      });

      wavesurferRef.current = wavesurfer;

      // Event listeners
      wavesurfer.on('ready', () => {
        if (mounted) {
          setIsLoading(false);
          if (loadTimeout) clearTimeout(loadTimeout);
        }
      });
      
      wavesurfer.on('play', () => {
        if (mounted) setIsPlaying(true);
      });
      
      wavesurfer.on('pause', () => {
        if (mounted) setIsPlaying(false);
      });
      
      wavesurfer.on('finish', () => {
        if (mounted) setIsPlaying(false);
      });
      
      wavesurfer.on('audioprocess', (time) => {
        if (mounted) setCurrentTime(Math.floor(time));
      });
      
      // Handle errors but ignore AbortError (happens on cleanup)
      wavesurfer.on('error', (err) => {
        // Ignore abort errors - they're expected during cleanup
        if (err?.name === 'AbortError' || err?.message?.includes('aborted')) {
          return;
        }
        console.error('WaveSurfer error (falling back to native player):', err);
        if (mounted) {
          setLoadError(true);
          setIsLoading(false);
          if (loadTimeout) clearTimeout(loadTimeout);
        }
      });

      // Set a timeout in case the audio doesn't load (CORS, network issues, etc.)
      loadTimeout = setTimeout(() => {
        if (mounted) {
          console.warn('WaveSurfer load timeout - falling back to native player');
          setLoadError(true);
          setIsLoading(false);
        }
      }, 5000); // 5 second timeout (reduced for faster fallback)

      // Load audio after setting up listeners
      try {
        wavesurfer.load(audioUrl);
      } catch (loadErr) {
        console.error('Failed to load audio:', loadErr);
        if (mounted) {
          setLoadError(true);
          setIsLoading(false);
          if (loadTimeout) clearTimeout(loadTimeout);
        }
      }
      
    } catch (err) {
      console.error('Failed to initialize WaveSurfer:', err);
      if (mounted) {
        setLoadError(true);
        setIsLoading(false);
      }
    }

    return () => {
      mounted = false;
      if (loadTimeout) clearTimeout(loadTimeout);
      if (wavesurferRef.current) {
        try {
          wavesurferRef.current.destroy();
        } catch (err) {
          // Ignore cleanup errors
        }
        wavesurferRef.current = null;
      }
    };
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
      <div className="flex flex-col gap-1 w-full">
        {isProblematicUrl(audioUrl) && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Volume2 className="h-3 w-3" />
            WhatsApp Voice Note
          </span>
        )}
        <div className="flex items-center gap-2 w-full p-2 bg-muted/50 rounded border">
          <audio
            controls
            src={audioUrl}
            className="w-full"
            style={{ maxHeight: '40px' }}
            preload="metadata"
            controlsList="nodownload"
          >
            <p className="text-xs text-muted-foreground">
              Your browser does not support the audio element.
            </p>
          </audio>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 w-full p-2 bg-muted/30 rounded border">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={togglePlayPause}
        disabled={isLoading}
        className="h-8 w-8 p-0 shrink-0"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>
      <div className="flex-1 min-w-0" style={{ minHeight: '40px' }}>
        <div ref={waveformRef} className="w-full h-full" />
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
        {formatTime(currentTime)} / {formatTime(duration || 0)}
      </span>
    </div>
  );
};

export default WaveformPlayer;
