import React, { useState, useCallback } from 'react';
import { voiceCloningService } from '../services/voiceCloningService';
import type { VoiceUploadResponse } from '../types/voice-cloning';
import { VoiceRecorder } from './VoiceRecorder';

type UploadMode = 'file' | 'record';

interface VoiceUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVoiceUploaded: (voiceId: string, voiceName: string) => void;
}

export const VoiceUploadModal: React.FC<VoiceUploadModalProps> = ({
  isOpen,
  onClose,
  onVoiceUploaded,
}) => {
  const [mode, setMode] = useState<UploadMode>('file');
  const [voiceName, setVoiceName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<VoiceUploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<{ blob: Blob; duration: number } | null>(null);

  const resetForm = () => {
    setVoiceName('');
    setSelectedFile(null);
    setRecordedAudio(null);
    setUploadProgress(0);
    setUploadResult(null);
    setError(null);
    setDragActive(false);
    setMode('file');
  };

  const handleClose = () => {
    if (!uploading) {
      resetForm();
      onClose();
    }
  };

  const handleFileSelect = (file: File) => {
    setError(null);

    const validation = voiceCloningService.validateAudioFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    setSelectedFile(file);

    // Auto-fill voice name from filename
    if (!voiceName) {
      const name = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9ก-๙_-]/g, '_');
      setVoiceName(name);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [voiceName]
  );

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleRecordingComplete = (audioBlob: Blob, duration: number) => {
    setRecordedAudio({ blob: audioBlob, duration });
    setError(null);

    // Auto-fill voice name if empty
    if (!voiceName) {
      const timestamp = new Date().toLocaleString('th-TH', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
      setVoiceName(`เสียงบันทึก_${timestamp}`);
    }
  };

  const handleUpload = async () => {
    let fileToUpload: File | null = null;

    if (mode === 'file') {
      if (!selectedFile) {
        setError('กรุณาเลือกไฟล์เสียง');
        return;
      }
      fileToUpload = selectedFile;
    } else if (mode === 'record') {
      if (!recordedAudio) {
        setError('กรุณาบันทึกเสียงก่อน');
        return;
      }
      // Convert Blob to File
      const timestamp = Date.now();
      fileToUpload = new File([recordedAudio.blob], `recording_${timestamp}.webm`, {
        type: recordedAudio.blob.type,
      });
    }

    if (!voiceName.trim()) {
      setError('กรุณาใส่ชื่อเสียง');
      return;
    }

    if (!fileToUpload) {
      setError('ไม่พบไฟล์เสียง');
      return;
    }

    setUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Simulate progress (since we can't track actual upload progress easily)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const result = await voiceCloningService.uploadVoiceSample(fileToUpload, voiceName);

      clearInterval(progressInterval);
      setUploadProgress(100);
      setUploadResult(result);

      // Notify parent
      onVoiceUploaded(result.voice_id, result.voice_name);

      // Auto-close after success
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'อัปโหลดล้มเหลว');
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const getRecommendationMessage = (duration: number) => {
    if (duration < 3) return '⚠️ สั้นเกินไป - แนะนำ 6-30 วินาที';
    if (duration >= 3 && duration < 6) return '⚠️ ค่อนข้างสั้น - แนะนำ 6-30 วินาที';
    if (duration >= 6 && duration <= 30) return '✅ ความยาวเหมาะสม!';
    if (duration > 30 && duration <= 60) return '✅ ใช้ได้ดี (จะใช้ 30 วินาทีแรก)';
    return '⚠️ ยาวเกินไป (จะใช้ 30 วินาทีแรก)';
  };

  const getRecommendationColor = (recommendation?: string) => {
    if (recommendation === 'optimal') return 'text-green-400';
    if (recommendation === 'acceptable') return 'text-yellow-400';
    return 'text-orange-400';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border-2 border-cyan-500/30 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-cyan-600 to-blue-600 p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                🎙️ {mode === 'file' ? 'อัปโหลดตัวอย่างเสียง' : 'บันทึกเสียงของคุณ'}
              </h2>
              <p className="text-cyan-100 text-sm mt-1">
                {mode === 'file'
                  ? 'อัปโหลดไฟล์เสียงเพื่อโคลนเสียงของคุณ'
                  : 'บันทึกเสียงจากไมโครโฟนโดยตรง'}
              </p>
            </div>
            <button
              onClick={handleClose}
              disabled={uploading}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors disabled:opacity-50"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Mode Tabs */}
          <div className="mt-4 flex gap-2 bg-white/10 p-1 rounded-lg">
            <button
              onClick={() => {
                setMode('file');
                setError(null);
                setRecordedAudio(null);
              }}
              disabled={uploading}
              className={`flex-1 px-4 py-2 rounded-md font-medium transition-all ${
                mode === 'file'
                  ? 'bg-white text-cyan-600 shadow-md'
                  : 'text-white hover:bg-white/10'
              } disabled:opacity-50`}
            >
              📁 อัปโหลดไฟล์
            </button>
            <button
              onClick={() => {
                setMode('record');
                setError(null);
                setSelectedFile(null);
              }}
              disabled={uploading}
              className={`flex-1 px-4 py-2 rounded-md font-medium transition-all ${
                mode === 'record'
                  ? 'bg-white text-cyan-600 shadow-md'
                  : 'text-white hover:bg-white/10'
              } disabled:opacity-50`}
            >
              🎤 บันทึกเสียง
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Voice Name Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">ชื่อเสียง</label>
            <input
              type="text"
              value={voiceName}
              onChange={e => setVoiceName(e.target.value)}
              placeholder="เช่น เสียงของฉัน, พากย์เรื่อง, etc."
              disabled={uploading}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
            />
          </div>

          {/* Conditional Content Based on Mode */}
          {mode === 'file' ? (
            <>
              {/* File Upload Area */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">ไฟล์เสียง</label>

                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : selectedFile
                        ? 'border-green-500 bg-green-500/10'
                        : 'border-gray-600 bg-gray-700/50'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  {selectedFile ? (
                    <div className="space-y-3">
                      <div className="text-green-400 text-4xl">✓</div>
                      <div className="text-white font-medium">{selectedFile.name}</div>
                      <div className="text-gray-400 text-sm">
                        {voiceCloningService.formatFileSize(selectedFile.size)}
                      </div>
                      <button
                        onClick={() => setSelectedFile(null)}
                        disabled={uploading}
                        className="text-cyan-400 hover:text-cyan-300 text-sm underline disabled:opacity-50"
                      >
                        เลือกไฟล์ใหม่
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-gray-400 text-5xl">🎵</div>
                      <div className="text-white">
                        ลากไฟล์มาวางที่นี่ หรือ
                        <label className="text-cyan-400 hover:text-cyan-300 cursor-pointer ml-1 underline">
                          เลือกไฟล์
                          <input
                            type="file"
                            accept="audio/*,.wav,.mp3,.flac,.ogg,.m4a"
                            onChange={handleFileInputChange}
                            className="hidden"
                            disabled={uploading}
                          />
                        </label>
                      </div>
                      <div className="text-gray-400 text-sm">
                        รองรับ: WAV, MP3, FLAC, OGG, M4A (สูงสุด 50MB)
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Recommendations */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <h3 className="text-blue-400 font-medium mb-2 flex items-center gap-2">
                  💡 คำแนะนำ
                </h3>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>
                    ✅ ความยาว: <strong>6-30 วินาที</strong> (แนะนำ)
                  </li>
                  <li>✅ เนื้อหา: พูดธรรมชาติ ไม่มีเสียงรบกวน</li>
                  <li>✅ คุณภาพ: ไฟล์เสียงคมชัด sample rate สูง</li>
                  <li>✅ ภาษา: พูดภาษาที่ต้องการสังเคราะห์</li>
                </ul>
              </div>
            </>
          ) : (
            <>
              {/* Voice Recorder */}
              <VoiceRecorder
                onRecordingComplete={handleRecordingComplete}
                maxDuration={30}
                minDuration={3}
              />

              {/* Recorded Audio Preview */}
              {recordedAudio && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2 text-green-400 font-medium">
                    <span>✅</span>
                    <span>บันทึกเสียงสำเร็จ!</span>
                  </div>
                  <div className="text-sm text-gray-300">
                    ความยาว: <strong>{recordedAudio.duration.toFixed(1)}s</strong>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-2">
              <span className="text-red-400">❌</span>
              <div className="flex-1 text-red-300 text-sm">{error}</div>
            </div>
          )}

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-gray-300">
                <span>กำลังอัปโหลด...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-cyan-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Upload Result */}
          {uploadResult && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-green-400 font-medium">
                <span>✅</span>
                <span>อัปโหลดสำเร็จ!</span>
              </div>
              <div className="text-sm text-gray-300 space-y-1">
                <div>
                  Voice ID: <code className="text-cyan-400">{uploadResult.voice_id}</code>
                </div>
                <div>
                  ความยาว: <strong>{uploadResult.duration.toFixed(1)}s</strong>
                </div>
                <div className={getRecommendationColor(uploadResult.recommendation)}>
                  {getRecommendationMessage(uploadResult.duration)}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleClose}
              disabled={uploading}
              className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors disabled:opacity-50"
            >
              {uploadResult ? 'ปิด' : 'ยกเลิก'}
            </button>
            <button
              onClick={handleUpload}
              disabled={
                uploading ||
                !voiceName.trim() ||
                !!uploadResult ||
                (mode === 'file' && !selectedFile) ||
                (mode === 'record' && !recordedAudio)
              }
              className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:from-cyan-500 hover:to-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {uploading ? '🔄 กำลังอัปโหลด...' : uploadResult ? '✅ สำเร็จ' : '📤 อัปโหลด'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

