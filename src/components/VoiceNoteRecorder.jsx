import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Mic, Trash2, Play, Pause, Square } from 'lucide-react';
import { toast } from 'sonner';
import WaveSurfer from 'wavesurfer.js';
import RecordPlugin from 'wavesurfer.js/dist/plugins/record.esm.js';

/**
 * Voice Note Recorder with WaveSurfer.js
 * Records audio with live waveform visualization
 */
const VoiceNoteRecorder = ({ onRecordingComplete, onDelete, onRecordingStateChange }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isPlayingPausedRecording, setIsPlayingPausedRecording] = useState(false);
  const [pausedBlob, setPausedBlob] = useState(null);
  
  const waveformRef = useRef(null);
  const wavesurferRef = useRef(null);
  const recordPluginRef = useRef(null);
  const timerRef = useRef(null);
  const pausedAudioRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const dataRequestIntervalRef = useRef(null);
  const isDeletingRef = useRef(false);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    // Start recording once container is ready
    if (isInitializing && waveformRef.current && !isRecording) {
      initializeRecording();
    }
  }, [isInitializing, isRecording]);

  const cleanup = () => {
    // Clear all intervals
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (dataRequestIntervalRef.current) {
      clearInterval(dataRequestIntervalRef.current);
      dataRequestIntervalRef.current = null;
    }
    
    // Stop and cleanup paused audio
    if (pausedAudioRef.current) {
      pausedAudioRef.current.pause();
      pausedAudioRef.current.src = '';
      pausedAudioRef.current = null;
    }
    
    // Cleanup record plugin
    if (recordPluginRef.current) {
      try {
        recordPluginRef.current.destroy();
      } catch (error) {
        console.error('Error destroying record plugin:', error);
      }
      recordPluginRef.current = null;
    }
    
    // Cleanup wavesurfer
    if (wavesurferRef.current) {
      try {
        wavesurferRef.current.destroy();
      } catch (error) {
        console.error('Error destroying wavesurfer:', error);
      }
      wavesurferRef.current = null;
    }
    
    // Clear waveform container
    if (waveformRef.current) {
      waveformRef.current.innerHTML = '';
    }
    
    // Clear media recorder reference
    mediaRecorderRef.current = null;
  };

  const handleStartClick = () => {
    setIsInitializing(true);
  };

  const initializeRecording = async () => {
    if (!waveformRef.current) {
      console.error('Waveform container still not ready');
      return;
    }

    try {
      // Clean up existing instances
      cleanup();

      // Create WaveSurfer for recording visualization
      wavesurferRef.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: 'rgb(59, 130, 246)',
        progressColor: 'rgb(37, 99, 235)',
        barWidth: 2,
        barGap: 2,
        barRadius: 2,
        height: 50,
        interact: false,
      });

      // Create RecordPlugin
      recordPluginRef.current = wavesurferRef.current.registerPlugin(
        RecordPlugin.create({
          scrollingWaveform: true,
          scrollingWaveformWindow: 3,
          renderRecordedAudio: false,
        })
      );

      // Listen for recording progress to capture MediaRecorder
      recordPluginRef.current.on('record-progress', (time) => {
        // Store reference to MediaRecorder if available
        if (recordPluginRef.current && !mediaRecorderRef.current) {
          // Access internal MediaRecorder from RecordPlugin
          mediaRecorderRef.current = recordPluginRef.current.mediaRecorder;
          
          // Listen for data chunks to build preview blob
          if (mediaRecorderRef.current) {
            mediaRecorderRef.current.addEventListener('dataavailable', (event) => {
              if (event.data && event.data.size > 0) {
                audioChunksRef.current.push(event.data);
              }
            });
            
            // Request data every 100ms to capture chunks
            if (mediaRecorderRef.current.state === 'recording') {
              dataRequestIntervalRef.current = setInterval(() => {
                if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                  mediaRecorderRef.current.requestData();
                } else {
                  clearInterval(dataRequestIntervalRef.current);
                }
              }, 100);
            }
          }
        }
      });

      // Handle recording end
      recordPluginRef.current.on('record-end', (blob) => {
        console.log('Recording ended:', {
          blob,
          type: blob?.type,
          size: blob?.size,
          recordingTime
        });
        
        // Skip if we're deleting
        if (isDeletingRef.current) {
          isDeletingRef.current = false;
          return;
        }
        
        setAudioBlob(blob);
        setIsRecording(false);
        setIsPaused(false);
        setIsInitializing(false);
        setPausedBlob(null);
        mediaRecorderRef.current = null;
        audioChunksRef.current = []; // Clear chunks
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        
        // Reinitialize WaveSurfer for playback
        initPlayback(blob);
        
        // Notify parent of state change
        if (onRecordingStateChange) {
          onRecordingStateChange({ isRecording: false, isPaused: false, hasRecording: true });
        }
        
        // Automatically notify parent with the recording
        console.log('Calling onRecordingComplete with:', { blob, recordingTime });
        if (onRecordingComplete) {
          onRecordingComplete(blob, recordingTime);
        }
      });

      // Start recording
      await recordPluginRef.current.startRecording();
      setIsRecording(true);
      setRecordingTime(0);
      audioChunksRef.current = []; // Initialize empty chunks array
      
      // Notify parent of recording state change
      if (onRecordingStateChange) {
        onRecordingStateChange({ isRecording: true, isPaused: false, hasRecording: false });
      }

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Could not access microphone');
      setIsInitializing(false);
    }
  };

  const initPlayback = (blob) => {
    if (!waveformRef.current) return;

    // Clean up existing
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
    }

    // Create new WaveSurfer for playback
    wavesurferRef.current = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: 'rgb(59, 130, 246)',
      progressColor: 'rgb(34, 197, 94)',
      cursorColor: 'transparent',
      barWidth: 2,
      barGap: 2,
      barRadius: 2,
      height: 50,
    });

    wavesurferRef.current.loadBlob(blob);

    wavesurferRef.current.on('finish', () => {
      setIsPlaying(false);
    });

    wavesurferRef.current.on('pause', () => {
      setIsPlaying(false);
    });

    wavesurferRef.current.on('play', () => {
      setIsPlaying(true);
    });
  };

  const pauseRecording = async () => {
    if (!recordPluginRef.current) return;
    
    try {
      // Pause the recording
      await recordPluginRef.current.pauseRecording();
      setIsPaused(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      // Notify parent of state change
      if (onRecordingStateChange) {
        onRecordingStateChange({ isRecording: true, isPaused: true, hasRecording: false });
      }
      
      // Create blob from collected chunks for preview
      if (audioChunksRef.current.length > 0) {
        // Determine mime type from first chunk or use default
        const mimeType = audioChunksRef.current[0].type || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        console.log('Paused blob created from chunks:', blob, 'Size:', blob.size);
        setPausedBlob(blob);
      } else {
        console.warn('No audio chunks available yet');
        setPausedBlob(null);
      }
    } catch (error) {
      console.error('Error pausing recording:', error);
    }
  };

  const resumeRecording = async () => {
    if (recordPluginRef.current) {
      // Clean up paused audio if playing
      if (pausedAudioRef.current) {
        pausedAudioRef.current.pause();
        pausedAudioRef.current = null;
      }
      setIsPlayingPausedRecording(false);
      setPausedBlob(null);
      
      await recordPluginRef.current.resumeRecording();
      setIsPaused(false);
      
      // Notify parent of state change
      if (onRecordingStateChange) {
        onRecordingStateChange({ isRecording: true, isPaused: false, hasRecording: false });
      }
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
  };

  const togglePlayPausedRecording = async () => {
    if (!isPaused) {
      console.log('Cannot play: not paused');
      return;
    }

    if (isPlayingPausedRecording) {
      // Stop playing
      if (pausedAudioRef.current) {
        pausedAudioRef.current.pause();
        pausedAudioRef.current.currentTime = 0;
      }
      setIsPlayingPausedRecording(false);
    } else {
      // Play the stored paused blob
      try {
        if (!pausedBlob) {
          toast.error('No recording available to play');
          console.log('No paused blob available');
          return;
        }
        
        console.log('Playing blob:', pausedBlob);
        const url = URL.createObjectURL(pausedBlob);
        const audio = new Audio(url);
        
        audio.onended = () => {
          setIsPlayingPausedRecording(false);
          URL.revokeObjectURL(url);
        };
        
        audio.onerror = (e) => {
          console.error('Audio playback error:', e);
          toast.error('Failed to play recording');
          setIsPlayingPausedRecording(false);
          URL.revokeObjectURL(url);
        };
        
        pausedAudioRef.current = audio;
        
        try {
          await audio.play();
          setIsPlayingPausedRecording(true);
        } catch (playError) {
          console.error('Play error:', playError);
          toast.error('Could not play audio');
          setIsPlayingPausedRecording(false);
          URL.revokeObjectURL(url);
        }
      } catch (error) {
        console.error('Error playing paused recording:', error);
        toast.error('Failed to play recording');
      }
    }
  };

  const stopRecording = async () => {
    if (recordPluginRef.current) {
      await recordPluginRef.current.stopRecording();
    }
  };

  const deleteRecording = async () => {
    // Set flag to prevent record-end from completing
    isDeletingRef.current = true;
    
    // Reset all states first to trigger immediate UI change
    setRecordingTime(0);
    setIsRecording(false);
    setIsPaused(false);
    setIsPlaying(false);
    setIsInitializing(false);
    setIsPlayingPausedRecording(false);
    setPausedBlob(null);
    setAudioBlob(null);
    audioChunksRef.current = [];
    
    // Stop recording if in progress (after state reset to prevent race conditions)
    if (recordPluginRef.current) {
      try {
        await recordPluginRef.current.stopRecording();
      } catch (error) {
        console.error('Error stopping recording during delete:', error);
      }
    }
    
    // Cleanup all resources
    cleanup();
    
    // Reset deleting flag after a delay to ensure record-end event is skipped
    setTimeout(() => {
      isDeletingRef.current = false;
    }, 100);
    
    // Notify parent of state change
    if (onRecordingStateChange) {
      onRecordingStateChange({ isRecording: false, isPaused: false, hasRecording: false });
    }
    
    // Notify parent that recording was deleted
    if (onDelete) {
      onDelete();
    }
  };

  const togglePlayback = () => {
    if (!wavesurferRef.current) return;

    if (isPlaying) {
      wavesurferRef.current.pause();
    } else {
      wavesurferRef.current.play();
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // If has recording (finished)
  if (audioBlob && !isRecording) {
    return (
      <div className="flex items-center gap-2 px-3 bg-gray-50 rounded-full border border-gray-200">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={togglePlayback}
          className="h-9 w-9 rounded-full bg-green-500 hover:bg-green-600 text-white shrink-0"
        >
          {isPlaying ? (
            <Pause className="h-4 w-4 fill-current" />
          ) : (
            <Play className="h-4 w-4 fill-current ml-0.5" />
          )}
        </Button>

        <div className="flex-1 min-w-0">
          <div ref={waveformRef} className="w-full" style={{ minHeight: '50px' }} />
        </div>

        <span className="text-sm font-medium text-gray-700 shrink-0 min-w-12">
          {formatTime(recordingTime)}
        </span>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={deleteRecording}
          className="h-9 w-9 rounded-full hover:bg-red-50 hover:text-red-600 shrink-0"
          title="Delete recording"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // If recording
  if (isRecording || isInitializing) {
    return (
      <div className="flex items-center gap-2 px-3 bg-blue-50 rounded-full border border-blue-200">
        {isInitializing && !isRecording ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled
            className="h-9 w-9 rounded-full shrink-0 bg-gray-300"
          >
            <Mic className="h-4 w-4 text-white animate-pulse" />
          </Button>
        ) : isPaused ? (
          <>
            {pausedBlob && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={togglePlayPausedRecording}
                className="h-9 w-9 rounded-full shrink-0 bg-blue-500 hover:bg-blue-600 text-white"
                title="Play recorded audio"
              >
                {isPlayingPausedRecording ? (
                  <Pause className="h-4 w-4 fill-current" />
                ) : (
                  <Play className="h-4 w-4 fill-current ml-0.5" />
                )}
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={resumeRecording}
              className="h-9 w-9 rounded-full shrink-0 bg-green-500 hover:bg-green-600 text-white"
              title="Continue recording"
            >
              <Mic className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={pauseRecording}
            className="h-9 w-9 rounded-full shrink-0 bg-yellow-500 hover:bg-yellow-600 text-white"
          >
            <Pause className="h-4 w-4 fill-current" />
          </Button>
        )}

        <div className="flex-1 min-w-0">
          <div ref={waveformRef} className="w-full" style={{ minHeight: '50px' }} />
        </div>

        <span className="text-sm font-medium text-gray-700 shrink-0 min-w-12">
          {isInitializing && !isRecording ? 'Starting...' : (
            <>{formatTime(recordingTime)}</>
          )}
        </span>

        {isRecording && (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={deleteRecording}
              className="h-9 w-9 rounded-full hover:bg-red-100 text-red-600 shrink-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={stopRecording}
              className="h-9 w-9 rounded-full bg-red-500 hover:bg-red-600 text-white shrink-0"
            >
              <Square className="h-3 w-3 fill-current" />
            </Button>
          </>
        )}
      </div>
    );
  }

  // Default: Start recording button
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={handleStartClick}
      className="h-9 w-9 rounded-full hover:bg-blue-50 hover:text-blue-600"
      title="Record voice note"
    >
      <Mic className="h-5 w-5" />
    </Button>
  );
};

export default VoiceNoteRecorder;
