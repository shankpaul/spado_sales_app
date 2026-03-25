import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Mic, Square, Trash2, Send } from 'lucide-react';
import { toast } from 'sonner';
import WaveformPlayer from './WaveformPlayer';

/**
 * VoiceRecorder Component
 * Records audio using MediaRecorder API with live waveform visualization
 * Supports press-and-hold recording mode
 */
const VoiceRecorder = ({ onRecordingComplete, onCancel, autoStart = false, pressAndHold = false }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPressing, setIsPressing] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const analyserRef = useRef(null);
  const audioContextRef = useRef(null);

  useEffect(() => {
    return () => {
      // Cleanup
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [audioUrl]);

  // Draw waveform visualization
  const drawWaveform = () => {
    if (!analyserRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    const analyser = analyserRef.current;
    
    // Set canvas size based on current dimensions
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = 80;
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      // Gradient background
      const gradient = canvasCtx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, 'rgb(240, 249, 255)');
      gradient.addColorStop(1, 'rgb(249, 250, 251)');
      canvasCtx.fillStyle = gradient;
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw waveform with glow effect
      canvasCtx.lineWidth = 3;
      canvasCtx.strokeStyle = 'rgb(59, 130, 246)';
      canvasCtx.shadowBlur = 10;
      canvasCtx.shadowColor = 'rgba(59, 130, 246, 0.3)';
      canvasCtx.beginPath();

      const sliceWidth = (canvas.width * 1.0) / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      canvasCtx.lineTo(canvas.width, canvas.height / 2);
      canvasCtx.stroke();
      
      // Reset shadow for next frame
      canvasCtx.shadowBlur = 0;
    };

    draw();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Setup audio context for visualization
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 2048;
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        
        // Stop visualization
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      // Start waveform visualization
      drawWaveform();

    } catch (error) {
      toast.error('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const cancelRecording = () => {
    if (isRecording) {
      stopRecording();
    }
    
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    chunksRef.current = [];
    
    if (onCancel) {
      onCancel();
    }
  };

  const sendRecording = () => {
    if (audioBlob && onRecordingComplete) {
      onRecordingComplete(audioBlob, recordingTime);
      
      // Reset
      setAudioBlob(null);
      setAudioUrl(null);
      setRecordingTime(0);
      chunksRef.current = [];
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Auto-start recording if autoStart prop is true
  useEffect(() => {
    if (autoStart && !isRecording && !audioBlob) {
      startRecording();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-3 p-4 bg-muted/50 rounded-lg border">
      {isRecording && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium">Recording...</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {formatTime(recordingTime)}
            </span>
          </div>
          
          {/* Live waveform visualization */}
          <canvas 
              ref={canvasRef}
              className="w-full h-20 bg-gradient-to-b from-blue-50 to-gray-50 rounded-lg border border-blue-100"
          />
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={stopRecording}
            className="gap-2 w-full"
          >
            <Square className="h-4 w-4" />
            Stop Recording
          </Button>
        </div>
      )}

      {audioBlob && !isRecording && (
        <div className="space-y-3">
          <div className="text-sm font-medium mb-2">Preview Recording</div>
          
          {/* Waveform player */}
          <WaveformPlayer audioUrl={audioUrl} duration={recordingTime} />
          
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={cancelRecording}
              className="gap-2 flex-1"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={sendRecording}
              className="gap-2 flex-1"
            >
              <Send className="h-4 w-4" />
              Send
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceRecorder;
