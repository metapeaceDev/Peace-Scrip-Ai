import React, { useState, useEffect } from 'react';
import { voiceCloningService } from '../services/voiceCloningService';
import type { VoiceProfile } from '../types/voice-cloning';

interface VoiceLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectVoice: (voiceId: string, voiceName: string) => void;
  selectedVoiceId?: string;
}

export const VoiceLibrary: React.FC<VoiceLibraryProps> = ({
  isOpen,
  onClose,
  onSelectVoice,
  selectedVoiceId,
}) => {
  const [voices, setVoices] = useState<VoiceProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadVoices = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await voiceCloningService.listVoices();
      setVoices(result.voices);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถโหลดเสียงได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadVoices();
    }
  }, [isOpen]);

  const handleDelete = async (voiceId: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบเสียงนี้?')) {
      return;
    }

    setDeleting(voiceId);
    try {
      await voiceCloningService.deleteVoice(voiceId);
      setVoices(voices.filter(v => v.voice_id !== voiceId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ลบเสียงล้มเหลว');
    } finally {
      setDeleting(null);
    }
  };

  const handleSelect = (voice: VoiceProfile) => {
    onSelectVoice(voice.voice_id, voice.voice_id.split('_')[0]);
    onClose();
  };

  const getQualityBadge = (recommendation?: string) => {
    if (recommendation === 'optimal') {
      return (
        <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">
          คุณภาพดีเยี่ยม
        </span>
      );
    }
    if (recommendation === 'acceptable') {
      return (
        <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded">ใช้ได้</span>
      );
    }
    return (
      <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded">
        ค่อนข้างสั้น
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border-2 border-cyan-500/30 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                📚 คลังเสียง
              </h2>
              <p className="text-cyan-100 text-sm mt-1">จัดการเสียงที่คุณโคลนไว้</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
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
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-cyan-400 text-center">
                <div className="text-4xl mb-2">🔄</div>
                <div>กำลังโหลด...</div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-2">
              <span className="text-red-400">❌</span>
              <div className="flex-1">
                <div className="text-red-300">{error}</div>
                <button
                  onClick={loadVoices}
                  className="text-cyan-400 hover:text-cyan-300 text-sm underline mt-2"
                >
                  ลองอีกครั้ง
                </button>
              </div>
            </div>
          )}

          {!loading && !error && voices.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-5xl mb-4">🎙️</div>
              <div className="text-gray-300 text-lg mb-2">ยังไม่มีเสียงในคลัง</div>
              <div className="text-gray-400 text-sm">
                อัปโหลดตัวอย่างเสียงเพื่อเริ่มโคลนเสียงของคุณ
              </div>
            </div>
          )}

          {!loading && !error && voices.length > 0 && (
            <div className="space-y-3">
              {voices.map(voice => (
                <div
                  key={voice.voice_id}
                  className={`bg-gray-700 border rounded-lg p-4 transition-all ${
                    selectedVoiceId === voice.voice_id
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Voice Icon */}
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center text-2xl">
                        🎤
                      </div>
                    </div>

                    {/* Voice Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white font-medium truncate">
                          {voice.voice_id.split('_')[0]}
                        </h3>
                        {selectedVoiceId === voice.voice_id && (
                          <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs rounded flex items-center gap-1">
                            <span>✓</span>
                            <span>ใช้งานอยู่</span>
                          </span>
                        )}
                        {getQualityBadge(voice.recommendation)}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-400 mb-2">
                        <div>
                          <span className="text-gray-500">ความยาว:</span>{' '}
                          <span className="text-gray-300">{voice.duration.toFixed(1)}s</span>
                        </div>
                        <div>
                          <span className="text-gray-500">ขนาด:</span>{' '}
                          <span className="text-gray-300">
                            {voiceCloningService.formatFileSize(voice.file_size)}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-500">อัปโหลดเมื่อ:</span>{' '}
                          <span className="text-gray-300">{formatDate(voice.created_at)}</span>
                        </div>
                      </div>

                      <div className="text-xs text-gray-500 font-mono truncate">
                        ID: {voice.voice_id}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleSelect(voice)}
                        disabled={selectedVoiceId === voice.voice_id}
                        className="px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm whitespace-nowrap"
                      >
                        {selectedVoiceId === voice.voice_id ? '✓ เลือกแล้ว' : 'เลือกเสียงนี้'}
                      </button>
                      <button
                        onClick={() => handleDelete(voice.voice_id)}
                        disabled={deleting === voice.voice_id}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-500 transition-colors disabled:opacity-50 text-sm whitespace-nowrap"
                      >
                        {deleting === voice.voice_id ? '🔄 ลบ...' : '🗑️ ลบ'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-700 p-4 bg-gray-800/50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">
              {voices.length > 0 ? (
                <>
                  เสียงทั้งหมด: <strong className="text-white">{voices.length}</strong> เสียง
                </>
              ) : (
                <>ยังไม่มีเสียง</>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
            >
              ปิด
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
