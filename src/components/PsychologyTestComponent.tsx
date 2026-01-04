import React from 'react';
import { PsychologyDisplay } from './PsychologyDisplay';
import type { Character } from '../types';

// Test character with sample data
const testCharacter: Character = {
  id: 'test-1',
  name: 'ทดสอบ Psychology Display',
  role: 'Test',
  description: 'Test character for Psychology Display',
  external: {},
  physical: {},
  fashion: {},
  internal: {
    consciousness: {
      'Sati (Awareness)': 75,
      'Sampajanna (Clear comprehension)': 80,
      'Metta (Loving kindness)': 85,
      'Karuna (Compassion)': 90,
      'Mudita (Joy in happiness)': 70,
      'Upekkha (Equanimity)': 65,
    },
    defilement: {
      'Lobha (Greed)': 20,
      'Anger (Anger)': 15,
      'Moha (delusion)': 25,
      'Mana (Conceit)': 18,
      'Ditthi (Wrong view)': 22,
      'Vicikiccha (doubt)': 30,
      'Thina-Middha (Sloth)': 28,
      'Uddhacca-Kukkucca (Restlessness)': 35,
      'Issa (Envy)': 12,
      'Macchariya (Stinginess)': 10,
    },
    subconscious: {
      'Attachment to': 'Family',
      'Craving Taanha': 'Success',
    },
  },
  goals: {
    objective: 'Find inner peace',
    need: 'Understanding of self',
    action: 'Meditation practice',
    conflict: 'Fear of unknown',
    backstory: 'Seeking enlightenment',
  },
};

export const PsychologyTestComponent: React.FC = () => {
  return (
    <div className="p-8 bg-gray-950 min-h-screen">
      <h1 className="text-3xl font-bold text-cyan-400 mb-8">
        🧪 Psychology Display Component Test
      </h1>

      <div className="mb-8 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
        <p className="text-yellow-300 text-sm">
          ⚠️ ถ้าคุณเห็นข้อความนี้แต่ไม่เห็น Psychology Profile card ข้างล่าง แสดงว่า component
          ไม่ได้ render หรือมี error
        </p>
        <p className="text-yellow-200 text-xs mt-2">เปิด Browser Console (F12) เพื่อดู errors</p>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-bold text-white mb-4">Full Display:</h2>
        <PsychologyDisplay character={testCharacter} />
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-bold text-white mb-4">Compact Display:</h2>
        <PsychologyDisplay character={testCharacter} compact={true} />
      </div>

      <div className="mt-8 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
        <p className="text-green-300 text-sm">
          ✅ ถ้าคุณเห็น Psychology Profile cards ข้างบน แสดงว่า component ทำงานถูกต้อง
        </p>
        <p className="text-green-200 text-xs mt-2">
          ปัญหาคือ browser cache - ลอง Hard Refresh (Cmd+Shift+R)
        </p>
      </div>
    </div>
  );
};

export default PsychologyTestComponent;
