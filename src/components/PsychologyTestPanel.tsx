/**
 * Psychology Test Panel
 * Interactive testing panel for Phase 1 psychology system
 * Helps visualize and validate psychology calculations before Phase 2 integration
 */

import React, { useState } from 'react';
import type { Character } from '../types';
import { calculatePsychologyProfile, calculateReaction } from '../services/psychologyCalculator';
import { PsychologyDisplay } from './PsychologyDisplay';

interface PsychologyTestPanelProps {
  character: Character;
  onClose: () => void;
}

const testEvents = [
  {
    id: 'praise',
    description: 'คนชมว่าคุณทำได้ดีมาก',
    intensity: 3,
    category: 'positive',
  },
  {
    id: 'insult',
    description: 'มีคนดุด่าและดูถูกคุณต่อหน้าคนอื่น',
    intensity: 7,
    category: 'negative',
  },
  {
    id: 'temptation',
    description: 'มีคนเสนอเงินจำนวนมากให้ทำสิ่งผิด',
    intensity: 8,
    category: 'temptation',
  },
  {
    id: 'suffering',
    description: 'เห็นคนอื่นกำลังทุกข์ทรมานอย่างมาก',
    intensity: 6,
    category: 'compassion',
  },
  {
    id: 'loss',
    description: 'สูญเสียสิ่งที่รักและทำมาตลอดชีวิต',
    intensity: 9,
    category: 'grief',
  },
  {
    id: 'success',
    description: 'ได้รับความสำเร็จที่ทุกคนปรารถนา',
    intensity: 5,
    category: 'pride',
  },
];

export const PsychologyTestPanel: React.FC<PsychologyTestPanelProps> = ({ character, onClose }) => {
  const [selectedEvent, setSelectedEvent] = useState(testEvents[0]);
  const [customEvent, setCustomEvent] = useState('');
  const [customIntensity, setCustomIntensity] = useState(5);
  const [useCustom, setUseCustom] = useState(false);

  const profile = calculatePsychologyProfile(character);

  const currentEvent =
    useCustom && customEvent.trim()
      ? { description: customEvent, intensity: customIntensity }
      : selectedEvent;

  const reaction = calculateReaction(character, currentEvent.description, currentEvent.intensity);

  // Generate AI-like response preview
  const generateDialoguePreview = () => {
    const { reactionType, emotionalTone } = reaction;

    if (reactionType === 'wholesome') {
      const responses = [
        `"${currentEvent.description.includes('ชม') ? 'ขอบคุณครับ แต่นี่เป็นหน้าที่ที่ต้องทำ' : 'ผม/ฉันเข้าใจความรู้สึกของคุณ'}"`,
        `*แสดงสีหน้า${emotionalTone}*`,
        `"${currentEvent.description.includes('ทุกข์') ? 'ให้ผม/ฉันช่วยคุณได้ไหม' : 'ไม่เป็นไร ทุกอย่างจะผ่านไป'}"`,
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    } else if (reactionType === 'unwholesome') {
      const responses = [
        `"${currentEvent.description.includes('ดุด่า') ? 'นี่มันอะไร! กล้าดียังไง!' : 'เอาเถอะ ทำไปเสีย!'}"`,
        `*แสดงสีหน้า${emotionalTone}*`,
        `"${currentEvent.description.includes('เงิน') ? 'ได้สิ ถ้ามันคุ้มค่า' : 'แกควรระวังตัวให้ดี'}"`,
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    } else {
      return `"${currentEvent.description.includes('สำเร็จ') ? 'ไม่รู้จะดีใจหรือกังวลดี...' : 'ผม/ฉันไม่แน่ใจว่าควรทำอย่างไร...'}"`;
    }
  };

  const getReactionColor = (type: string) => {
    switch (type) {
      case 'wholesome':
        return 'text-green-400 bg-green-500/20 border-green-500/50';
      case 'unwholesome':
        return 'text-red-400 bg-red-500/20 border-red-500/50';
      default:
        return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50';
    }
  };

  const getReactionIcon = (type: string) => {
    switch (type) {
      case 'wholesome':
        return '✨';
      case 'unwholesome':
        return '⚠️';
      default:
        return '🤔';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-gray-900 border-2 border-cyan-500/50 rounded-2xl max-w-6xl w-full my-8 shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border-b border-cyan-500/30 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-cyan-400 uppercase tracking-wide">
                🧪 Psychology Test Lab
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                ทดสอบการตอบสนองของ <span className="text-white font-bold">{character.name}</span>{' '}
                ต่อสถานการณ์ต่างๆ
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
          {/* Left Column: Character Profile */}
          <div className="space-y-4">
            <PsychologyDisplay character={character} />

            {/* Quick Stats */}
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <div className="text-xs uppercase tracking-wider text-gray-400 mb-3">
                Quick Analysis
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Mental Type:</span>
                  <span
                    className={`font-bold ${profile.mentalBalance > 0 ? 'text-green-400' : 'text-red-400'}`}
                  >
                    {profile.mentalBalance > 30
                      ? 'Highly Virtuous'
                      : profile.mentalBalance > 0
                        ? 'Slightly Virtuous'
                        : profile.mentalBalance > -30
                          ? 'Slightly Troubled'
                          : 'Highly Troubled'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Likely to:</span>
                  <span className="text-cyan-400 font-bold">
                    {profile.mentalBalance > 0 ? 'Act with wisdom' : 'React emotionally'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Weak against:</span>
                  <span className="text-red-400 font-bold text-xs">
                    {profile.strongestDefilement.split('(')[0].trim()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Event Testing */}
          <div className="space-y-4">
            {/* Event Selection */}
            <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl p-6">
              <h3 className="text-lg font-bold text-purple-400 mb-4 uppercase tracking-wide">
                🎭 Select Test Event
              </h3>

              {/* Preset Events */}
              <div className="space-y-2 mb-4">
                {testEvents.map(event => (
                  <button
                    key={event.id}
                    onClick={() => {
                      setSelectedEvent(event);
                      setUseCustom(false);
                    }}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      !useCustom && selectedEvent.id === event.id
                        ? 'bg-purple-500/30 border-purple-400 shadow-lg shadow-purple-500/20'
                        : 'bg-gray-800/50 border-gray-700 hover:border-purple-500/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-white text-sm">{event.description}</span>
                      <span className="text-xs px-2 py-1 rounded bg-gray-900/50 text-gray-400">
                        Intensity: {event.intensity}/10
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Custom Event */}
              <div className="border-t border-purple-500/30 pt-4">
                <label className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    checked={useCustom}
                    onChange={e => setUseCustom(e.target.checked)}
                    className="w-4 h-4 accent-purple-500"
                  />
                  <span className="text-sm text-gray-300 font-bold">Custom Event</span>
                </label>

                {useCustom && (
                  <div className="space-y-2">
                    <textarea
                      value={customEvent}
                      onChange={e => setCustomEvent(e.target.value)}
                      placeholder="กรอกเหตุการณ์ของคุณเอง..."
                      className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      rows={2}
                    />
                    <div className="flex items-center gap-3">
                      <label className="text-xs text-gray-400">Intensity:</label>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={customIntensity}
                        onChange={e => setCustomIntensity(parseInt(e.target.value))}
                        className="flex-1 accent-purple-500"
                      />
                      <span className="text-sm font-bold text-purple-400 w-12 text-right">
                        {customIntensity}/10
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Reaction Result */}
            <div className={`border-2 rounded-xl p-6 ${getReactionColor(reaction.reactionType)}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="text-4xl">{getReactionIcon(reaction.reactionType)}</div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-wide">
                    {reaction.reactionType === 'wholesome'
                      ? 'Wholesome Reaction'
                      : reaction.reactionType === 'unwholesome'
                        ? 'Unwholesome Reaction'
                        : 'Neutral Reaction'}
                  </h3>
                  <p className="text-sm opacity-80">{currentEvent.description}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="bg-black/20 rounded-lg p-3">
                  <div className="text-xs uppercase tracking-wider opacity-70 mb-1">
                    Emotional Tone
                  </div>
                  <div className="text-lg font-bold">{reaction.emotionalTone}</div>
                </div>

                <div className="bg-black/20 rounded-lg p-3">
                  <div className="text-xs uppercase tracking-wider opacity-70 mb-1">Intensity</div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-900/50 rounded-full h-2">
                      <div
                        className="h-full rounded-full bg-current transition-all"
                        style={{ width: `${Math.min(reaction.intensity, 100)}%` }}
                      />
                    </div>
                    <span className="text-lg font-black w-16 text-right">
                      {reaction.intensity.toFixed(0)}%
                    </span>
                  </div>
                </div>

                <div className="bg-black/20 rounded-lg p-3">
                  <div className="text-xs uppercase tracking-wider opacity-70 mb-1">
                    Psychology Reasoning
                  </div>
                  <p className="text-sm leading-relaxed">{reaction.reasoning}</p>
                </div>

                <div className="bg-black/30 rounded-lg p-4 border-2 border-current/30">
                  <div className="text-xs uppercase tracking-wider opacity-70 mb-2">
                    💬 Expected AI Dialogue/Action
                  </div>
                  <p className="text-base italic leading-relaxed">{generateDialoguePreview()}</p>
                  <p className="text-xs opacity-60 mt-2">
                    * This is what AI would likely generate based on the psychology profile
                  </p>
                </div>
              </div>
            </div>

            {/* Comparison Hint */}
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
              <div className="text-xs uppercase tracking-wider text-cyan-400 mb-2">
                💡 Testing Tip
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">
                ลองสร้างตัวละคร 2 แบบที่ตรงข้ามกัน (1 ตัวมีคุณธรรมสูง, 1 ตัวมีกิเลสสูง)
                แล้วทดสอบกับเหตุการณ์เดียวกัน คุณจะเห็นความแตกต่างอย่างชัดเจน!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PsychologyTestPanel;

