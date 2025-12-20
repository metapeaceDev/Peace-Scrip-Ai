/**
 * Citta Display Component
 * Shows current and recent Citta (consciousness) types with color coding
 * Based on Digital Mind Model v14
 */

import React from 'react';
import type { Character, CittaType } from '../types';

interface CittaDisplayProps {
  character: Character;
  showHistory?: boolean; // Show recent citta history
  compact?: boolean; // Compact view for small spaces
}

export const CittaDisplay: React.FC<CittaDisplayProps> = ({
  character,
  showHistory = true,
  compact = false,
}) => {
  const mindState = character.mind_state;

  if (
    !mindState ||
    !mindState.recent_citta_history ||
    mindState.recent_citta_history.length === 0
  ) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-500">ไม่มีข้อมูล Citta</p>
      </div>
    );
  }

  const currentCitta = mindState.recent_citta_history[mindState.recent_citta_history.length - 1];
  const history = showHistory ? mindState.recent_citta_history.slice(-7) : []; // Last 7 moments

  /**
   * Get color based on Citta type
   */
  const getCittaColor = (citta: CittaType): string => {
    if (citta.includes('kusala') || citta.includes('Kusala')) {
      return 'bg-green-100 text-green-800 border-green-300';
    }
    if (citta.includes('akusala') || citta.includes('Akusala')) {
      return 'bg-red-100 text-red-800 border-red-300';
    }
    if (citta.includes('vipaka') || citta.includes('Vipaka')) {
      return 'bg-blue-100 text-blue-800 border-blue-300';
    }
    if (citta.includes('kiriya') || citta.includes('Kiriya')) {
      return 'bg-gray-100 text-gray-800 border-gray-300';
    }
    return 'bg-purple-100 text-purple-800 border-purple-300';
  };

  /**
   * Get Thai name for Citta type
   */
  const getThaiName = (citta: CittaType): string => {
    // Simple mapping - can be expanded
    if (citta.includes('lobha')) return 'โลภะ (Greed-rooted)';
    if (citta.includes('dosa')) return 'โทสะ (Hatred-rooted)';
    if (citta.includes('moha')) return 'โมหะ (Delusion-rooted)';
    if (citta.includes('kusala')) return 'กุศล (Wholesome)';
    if (citta.includes('akusala')) return 'อกุศล (Unwholesome)';
    return citta;
  };

  if (compact) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border ${getCittaColor(currentCitta)}">
        <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
        <span className="text-xs font-medium">{getThaiName(currentCitta)}</span>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span className="text-2xl">🧠</span>
        <span>จิต (Citta) - {character.name}</span>
      </h3>

      {/* Current Citta */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          จิตปัจจุบัน (Current Citta):
        </label>
        <div className={`p-4 rounded-lg border-2 ${getCittaColor(currentCitta)}`}>
          <div className="font-semibold text-lg">{currentCitta}</div>
          <div className="text-sm mt-1">{getThaiName(currentCitta)}</div>
        </div>
      </div>

      {/* Citta History */}
      {showHistory && history.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Javana Process (ล่าสุด 7 ขณะ):
          </label>
          <div className="grid grid-cols-7 gap-2">
            {history.map((citta: CittaType, index: number) => (
              <div
                key={index}
                className={`p-2 rounded text-center border ${getCittaColor(citta)} transition-all hover:scale-105`}
                title={citta}
              >
                <div className="text-xs font-medium">#{index + 1}</div>
                <div className="text-xs mt-1 truncate">{citta.split('_')[0]}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-gray-500">
            💡 Javana = 7 ขณะของจิตที่สร้างกรรม (Kamma-generating moments)
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="text-xs font-medium text-gray-700 mb-2">สีแสดงประเภทจิต:</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-green-500"></span>
            <span>กุศล (Kusala)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-red-500"></span>
            <span>อกุศล (Akusala)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-blue-500"></span>
            <span>วิบาก (Vipaka)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-gray-500"></span>
            <span>กิริยา (Kiriya)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CittaDisplay;

