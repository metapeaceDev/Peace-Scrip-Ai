import React, { useState, useRef, useEffect } from 'react';

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
  maxDuration?: number; // seconds
  minDuration?: number; // seconds
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onRecordingComplete,
  maxDuration = 30,
  minDuration = 3,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<string>('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Direct cleanup without calling stopRecording
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Get user device info
  const getDeviceInfo = () => {
    const userAgent = navigator.userAgent;
    if (/iPhone|iPad|iPod/i.test(userAgent)) {
      return '📱 iOS Device';
    } else if (/Android/i.test(userAgent)) {
      return '📱 Android Device';
    } else if (/Mobile|Tablet/i.test(userAgent)) {
      return '📱 Mobile Device';
    }
    return '💻 Desktop';
  };

  // Initialize audio level monitoring
  const initializeAudioMonitoring = (stream: MediaStream) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);

      analyser.smoothingTimeConstant = 0.8;
      analyser.fftSize = 1024;

      microphone.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      monitorAudioLevel();
    } catch (err) {
      console.warn('Audio monitoring not available:', err);
    }
  };

  // Monitor audio level for visual feedback
  const monitorAudioLevel = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

    const checkLevel = () => {
      if (!analyserRef.current || !isRecording) return;

      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      setAudioLevel(Math.min(100, (average / 128) * 100));

      animationFrameRef.current = requestAnimationFrame(checkLevel);
    };

    checkLevel();
  };

  const startRecording = async () => {
    try {
      setError(null);
      setDeviceInfo(getDeviceInfo());

      // Request microphone access with optimal settings
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          // Optimal settings for voice
          sampleRate: 44100,
          channelCount: 1,
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Initialize audio monitoring
      initializeAudioMonitoring(stream);

      // Determine supported MIME type
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        // Fallback for Safari/iOS
        const types = ['audio/mp4', 'audio/webm', 'audio/ogg', 'audio/wav'];
        mimeType = types.find(type => MediaRecorder.isTypeSupported(type)) || '';
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000,
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

        // Convert to WAV if needed (for better compatibility)
        if (recordingTime >= minDuration) {
          onRecordingComplete(audioBlob, recordingTime);
        } else {
          setError(`กรุณาบันทึกอย่างน้อย ${minDuration} วินาที`);
        }

        // Cleanup
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
      };

      mediaRecorder.start(100); // Collect data every 100ms
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;

          // Auto-stop at max duration
          if (newTime >= maxDuration) {
            stopRecording();
          }

          return newTime;
        });
      }, 1000);
    } catch (err) {
      let errorMessage = 'ไม่สามารถเข้าถึงไมโครโฟนได้';

      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          errorMessage = 'กรุณาอนุญาตการใช้ไมโครโฟนในการตั้งค่าเบราว์เซอร์';
        } else if (err.name === 'NotFoundError') {
          errorMessage = 'ไม่พบไมโครโฟนในอุปกรณ์';
        } else if (err.name === 'NotReadableError') {
          errorMessage = 'ไมโครโฟนกำลังถูกใช้งานโดยแอปพลิเคชันอื่น';
        }
      }

      setError(errorMessage);
      console.error('Error accessing microphone:', err);
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);

      // Resume timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          if (newTime >= maxDuration) {
            stopRecording();
          }
          return newTime;
        });
      }, 1000);
    }
  };

  const stopRecording = (_shouldProcess: boolean = true) => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      setAudioLevel(0);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = () => {
    if (recordingTime < minDuration) return 'text-orange-400';
    if (recordingTime >= maxDuration * 0.9) return 'text-red-400';
    return 'text-green-400';
  };

  const getRecommendationText = () => {
    if (recordingTime < minDuration) {
      return `อย่างน้อย ${minDuration} วินาที`;
    }
    if (recordingTime > maxDuration * 0.9) {
      return 'ใกล้ถึงเวลาสูงสุด';
    }
    return 'ความยาวเหมาะสม';
  };

  return (
    <div className="space-y-4">
      {/* Device Info */}
      {deviceInfo && <div className="text-center text-sm text-gray-400">{deviceInfo}</div>}

      {/* Recording Interface */}
      <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/20 rounded-xl border border-purple-500/30 p-6">
        {/* Microphone Visual */}
        <div className="flex justify-center mb-6">
          <div className={`relative ${isRecording ? 'animate-pulse' : ''}`}>
            <div
              className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${
                isRecording
                  ? 'bg-red-500/20 border-4 border-red-500'
                  : 'bg-purple-500/20 border-4 border-purple-500'
              }`}
              style={{
                transform: isRecording ? `scale(${1 + audioLevel / 200})` : 'scale(1)',
              }}
            >
              <span className="text-6xl">🎤</span>
            </div>

            {isRecording && (
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-red-500 rounded-full"
                      style={{
                        height: `${8 + (audioLevel / 10) * (i + 1)}px`,
                        opacity: audioLevel > i * 20 ? 1 : 0.3,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Timer and Status */}
        <div className="text-center space-y-2 mb-6">
          <div className={`text-4xl font-mono font-bold ${getTimeColor()}`}>
            {formatTime(recordingTime)}
          </div>
          <div className="text-sm text-gray-400">
            {isRecording ? (
              isPaused ? (
                '⏸️ หยุดชั่วคราว'
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                  กำลังบันทึก...
                </span>
              )
            ) : (
              getRecommendationText()
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                recordingTime < minDuration
                  ? 'bg-orange-500'
                  : recordingTime >= maxDuration * 0.9
                    ? 'bg-red-500'
                    : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(100, (recordingTime / maxDuration) * 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{minDuration}s (ต่ำสุด)</span>
            <span>{maxDuration}s (สูงสุด)</span>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex justify-center gap-4">
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="px-8 py-4 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white rounded-full font-medium transition-all transform hover:scale-105 flex items-center gap-2 shadow-lg"
            >
              <span className="text-2xl">⏺</span>
              <span>เริ่มบันทึก</span>
            </button>
          ) : (
            <>
              {!isPaused ? (
                <button
                  onClick={pauseRecording}
                  className="px-6 py-3 bg-yellow-600 hover:bg-yellow-500 text-white rounded-full font-medium transition-all flex items-center gap-2"
                >
                  <span className="text-xl">⏸</span>
                  <span>หยุดชั่วคราว</span>
                </button>
              ) : (
                <button
                  onClick={resumeRecording}
                  className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-full font-medium transition-all flex items-center gap-2"
                >
                  <span className="text-xl">▶️</span>
                  <span>บันทึกต่อ</span>
                </button>
              )}

              <button
                onClick={() => stopRecording()}
                disabled={recordingTime < minDuration}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-full font-medium transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-xl">⏹</span>
                <span>เสร็จสิ้น</span>
              </button>
            </>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
            <span className="text-red-400">⚠️</span>
            <div className="flex-1 text-red-300 text-sm">{error}</div>
          </div>
        )}

        {/* Instructions */}
        {!isRecording && !error && (
          <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="text-blue-400 text-sm space-y-1">
              <div className="font-medium mb-2">💡 คำแนะนำการบันทึก:</div>
              <ul className="text-xs space-y-1 ml-4">
                <li>✅ อยู่ในที่เงียบ ไม่มีเสียงรบกวน</li>
                <li>✅ พูดเป็นธรรมชาติ ระยะห่างจากไมค์ 15-20 ซม.</li>
                <li>✅ พูดภาษาที่ต้องการใช้งาน (ไทย/อังกฤษ)</li>
                <li>
                  ✅ บันทึก {minDuration}-{maxDuration} วินาที
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Audio Level Indicator */}
      {isRecording && (
        <div className="flex items-center gap-3 bg-gray-800/50 rounded-lg p-3">
          <span className="text-sm text-gray-400">ระดับเสียง:</span>
          <div className="flex-1 bg-gray-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-100"
              style={{ width: `${audioLevel}%` }}
            />
          </div>
          <span className="text-sm text-gray-400 w-12 text-right">{Math.round(audioLevel)}%</span>
        </div>
      )}
    </div>
  );
};
