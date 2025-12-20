/**
 * Psychology Timeline Component
 * Displays character psychology evolution throughout the story
 */

import React, { useState } from 'react';
import type { CharacterPsychologyTimeline } from '../types';

interface PsychologyTimelineProps {
  timeline: CharacterPsychologyTimeline;
  onClose: () => void;
}

export const PsychologyTimeline: React.FC<PsychologyTimelineProps> = ({ timeline, onClose }) => {
  const [selectedScene, setSelectedScene] = useState<number | null>(null);

  console.log('📊 PsychologyTimeline received:', {
    timeline,
    hasSnapshots: timeline?.snapshots?.length,
    hasChanges: timeline?.changes?.length,
    overallArc: timeline?.overallArc,
  });

  // Filter out invalid snapshots to prevent undefined errors
  const validSnapshots = (timeline.snapshots || []).filter(
    s =>
      s &&
      typeof s === 'object' &&
      typeof s.mentalBalance === 'number' &&
      typeof s.sceneNumber === 'number'
  );

  const { characterName, changes, overallArc } = timeline;
  const snapshots = validSnapshots;

  if (!snapshots || snapshots.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-gray-900 border-2 border-purple-500/50 rounded-2xl max-w-2xl w-full p-8 text-center">
          <h2 className="text-2xl font-bold text-purple-400 mb-4">ยังไม่มีข้อมูลการเปลี่ยนแปลง</h2>
          <p className="text-gray-400 mb-6">
            ตัวละคร <span className="text-white font-bold">{characterName || 'ไม่ระบุชื่อ'}</span>{' '}
            ยังไม่มีฉากที่สร้างแล้ว
            <br />
            กรุณาสร้างฉากเพื่อเริ่มติดตามการเปลี่ยนแปลงทางจิตใจ
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
          >
            ปิด
          </button>
        </div>
      </div>
    );
  }

  const chartHeight = 300;
  const chartWidth = Math.max(600, snapshots.length * 60);

  const balancePath =
    snapshots.length > 1
      ? snapshots
          .map((snapshot, i) => {
            const x = (i / (snapshots.length - 1)) * chartWidth;
            const y = chartHeight / 2 - (snapshot.mentalBalance / 100) * (chartHeight / 2);
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
          })
          .join(' ')
      : '';

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-gray-900 border-2 border-purple-500/50 rounded-2xl max-w-6xl w-full my-8 shadow-2xl">
        <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-b border-purple-500/30 p-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-purple-400 uppercase tracking-wide">
                📈 Psychology Timeline
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                การเปลี่ยนแปลงทางจิตใจของ{' '}
                <span className="text-white font-bold">{characterName}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              ✕ ปิด
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(100vh-12rem)] p-6 space-y-6">
          <div
            className={`border-2 rounded-xl p-6 ${
              overallArc.direction === 'กุศลขึ้น'
                ? 'bg-green-500/10 border-green-500/50'
                : overallArc.direction === 'กุศลลง'
                  ? 'bg-red-500/10 border-red-500/50'
                  : 'bg-yellow-500/10 border-yellow-500/50'
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="text-4xl">
                {overallArc.direction === 'กุศลขึ้น'
                  ? '📈'
                  : overallArc.direction === 'กุศลลง'
                    ? '📉'
                    : '➡️'}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  Character Arc: {overallArc.direction}
                </h3>
                <p className="text-sm text-gray-300">
                  เปลี่ยนแปลง: {overallArc.totalChange > 0 ? '+' : ''}
                  {overallArc.totalChange.toFixed(1)} คะแนน (จาก{' '}
                  {overallArc.startingBalance.toFixed(1)} → {overallArc.endingBalance.toFixed(1)})
                </p>
              </div>
            </div>
            <div className="bg-black/20 rounded-lg p-4">
              <p className="text-sm text-gray-200 whitespace-pre-line leading-relaxed">
                {overallArc.interpretation}
              </p>
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-bold text-cyan-400 mb-4">Mental Balance Over Time</h3>

            <div className="overflow-x-auto">
              <svg
                width={chartWidth}
                height={chartHeight}
                className="mx-auto"
                style={{ minWidth: '100%' }}
              >
                <line
                  x1="0"
                  y1={chartHeight / 2}
                  x2={chartWidth}
                  y2={chartHeight / 2}
                  stroke="#4B5563"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                />
                <line x1="0" y1="0" x2={chartWidth} y2="0" stroke="#4B5563" strokeWidth="1" />
                <line
                  x1="0"
                  y1={chartHeight}
                  x2={chartWidth}
                  y2={chartHeight}
                  stroke="#4B5563"
                  strokeWidth="1"
                />

                <text x="5" y="15" fill="#10B981" fontSize="12">
                  +100 (Max Virtue)
                </text>
                <text x="5" y={chartHeight / 2 - 5} fill="#9CA3AF" fontSize="12">
                  0 (Neutral)
                </text>
                <text x="5" y={chartHeight - 5} fill="#EF4444" fontSize="12">
                  -100 (Max Defilement)
                </text>

                <path
                  d={balancePath}
                  fill="none"
                  stroke="#8B5CF6"
                  strokeWidth="3"
                  strokeLinecap="round"
                />

                {snapshots.map((snapshot, i) => {
                  const x = (i / (snapshots.length - 1)) * chartWidth;
                  const y = chartHeight / 2 - (snapshot.mentalBalance / 100) * (chartHeight / 2);
                  const isSelected = selectedScene === i;

                  return (
                    <g key={i}>
                      <circle
                        cx={x}
                        cy={y}
                        r={isSelected ? 8 : 5}
                        fill={
                          snapshot.mentalBalance > 0
                            ? '#10B981'
                            : snapshot.mentalBalance < 0
                              ? '#EF4444'
                              : '#FCD34D'
                        }
                        stroke="#fff"
                        strokeWidth={isSelected ? 3 : 2}
                        className="cursor-pointer transition-all hover:r-8"
                        onClick={() => setSelectedScene(i)}
                      />
                      <text
                        x={x}
                        y={chartHeight + 20}
                        textAnchor="middle"
                        fill="#9CA3AF"
                        fontSize="10"
                      >
                        Scene {snapshot.sceneNumber}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-bold text-cyan-400 mb-4">Scene-by-Scene Analysis</h3>

            <div className="space-y-4">
              {changes.map((change, i) => {
                const snapshot = snapshots[i + 1];
                // Skip if snapshot is invalid
                if (!snapshot || typeof snapshot.mentalBalance !== 'number') {
                  return null;
                }
                const isSelected = selectedScene === i + 1;

                return (
                  <div
                    key={i}
                    onClick={() => setSelectedScene(i + 1)}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-purple-400 bg-purple-500/20 shadow-lg'
                        : 'border-gray-600 bg-gray-900/50 hover:border-purple-500/50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-bold text-white">
                          Scene {change.sceneNumber}: {change.reasoning.split(':')[0]}
                        </h4>
                        <div
                          className={`inline-flex items-center gap-2 mt-1 px-3 py-1 rounded-full text-xs ${
                            change.karma_type === 'กุศลกรรม'
                              ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                              : change.karma_type === 'อกุศลกรรม'
                                ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                                : 'bg-gray-500/20 text-gray-400 border border-gray-500/50'
                          }`}
                        >
                          {change.karma_type === 'กุศลกรรม'
                            ? '✨'
                            : change.karma_type === 'อกุศลกรรม'
                              ? '⚠️'
                              : '➖'}
                          <span>{change.karma_type}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-400">Mental Balance</div>
                        <div
                          className={`text-xl font-bold ${
                            snapshot.mentalBalance > 0
                              ? 'text-green-400'
                              : snapshot.mentalBalance < 0
                                ? 'text-red-400'
                                : 'text-yellow-400'
                          }`}
                        >
                          {snapshot.mentalBalance > 0 ? '+' : ''}
                          {snapshot.mentalBalance.toFixed(1)}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded p-3">
                        <div className="text-xs font-bold text-blue-400 mb-1">กาย (Physical)</div>
                        <div className="text-xs text-gray-300 space-y-1">
                          {change.action.กาย.length > 0 ? (
                            change.action.กาย.map((action, idx) => (
                              <div key={idx}>• {action.substring(0, 100)}...</div>
                            ))
                          ) : (
                            <div className="text-gray-500">ไม่มีข้อมูล</div>
                          )}
                        </div>
                      </div>

                      <div className="bg-green-500/10 border border-green-500/30 rounded p-3">
                        <div className="text-xs font-bold text-green-400 mb-1">วาจา (Speech)</div>
                        <div className="text-xs text-gray-300 space-y-1">
                          {change.action.วาจา.length > 0 ? (
                            change.action.วาจา
                              .slice(0, 3)
                              .map((speech, idx) => (
                                <div key={idx}>&quot;{speech.substring(0, 80)}...&quot;</div>
                              ))
                          ) : (
                            <div className="text-gray-500">ไม่มีบทพูด</div>
                          )}
                        </div>
                      </div>

                      <div className="bg-purple-500/10 border border-purple-500/30 rounded p-3">
                        <div className="text-xs font-bold text-purple-400 mb-1">ใจ (Mental)</div>
                        <div className="text-xs text-gray-300 space-y-1">
                          {change.action.ใจ.length > 0 ? (
                            change.action.ใจ.map((thought, idx) => (
                              <div key={idx}>💭 {thought.substring(0, 100)}...</div>
                            ))
                          ) : (
                            <div className="text-gray-500">ไม่มีความคิด</div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="bg-black/30 rounded p-3">
                      <div className="text-xs font-bold text-gray-400 mb-1">
                        Psychology Reasoning
                      </div>
                      <p className="text-sm text-gray-200">{change.reasoning}</p>
                    </div>

                    {(Object.keys(change.consciousness_delta).length > 0 ||
                      Object.keys(change.defilement_delta).length > 0) && (
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        {Object.keys(change.consciousness_delta).length > 0 && (
                          <div className="bg-green-500/10 rounded p-2">
                            <div className="text-xs font-bold text-green-400 mb-1">
                              Consciousness Changes
                            </div>
                            <div className="text-xs text-gray-300 space-y-1">
                              {Object.entries(change.consciousness_delta).map(([virtue, delta]) => (
                                <div key={virtue}>
                                  {virtue.split('(')[0].trim()}: {delta > 0 ? '+' : ''}
                                  {delta}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {Object.keys(change.defilement_delta).length > 0 && (
                          <div className="bg-red-500/10 rounded p-2">
                            <div className="text-xs font-bold text-red-400 mb-1">
                              Defilement Changes
                            </div>
                            <div className="text-xs text-gray-300 space-y-1">
                              {Object.entries(change.defilement_delta).map(
                                ([defilement, delta]) => (
                                  <div key={defilement}>
                                    {defilement.split('(')[0].trim()}: {delta > 0 ? '+' : ''}
                                    {delta}
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PsychologyTimeline;

