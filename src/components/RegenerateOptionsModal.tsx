import React, { useState } from 'react';

export type RegenerationMode = 'fresh' | 'refine' | 'use-edited';

interface RegenerateOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (mode: RegenerationMode) => void;
  sceneName: string;
  hasEdits: boolean;
}

export const RegenerateOptionsModal: React.FC<RegenerateOptionsModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  sceneName,
  hasEdits,
}) => {
  const [selectedMode, setSelectedMode] = useState<RegenerationMode>('fresh');

  // Detect context: Step 2 (Idea/Boundary), Step 3 (Character), Step 4 (Story Structure/Plot Point), or Scene
  // Step 2 fields: Big Idea, Premise, Theme, Log Line, Synopsis, Timeline, All Boundary Fields
  const step2Fields = [
    'Big Idea',
    'Premise',
    'Theme',
    'Log Line',
    'Synopsis',
    'Timeline',
    'All Boundary',
    'Boundary',
  ];
  const isIdeaMode = step2Fields.some(field => sceneName.includes(field));

  // Step 3 fields: Character (all character-related)
  const step3Fields = ['Character', 'All Characters', 'Character Details'];
  const isCharacterMode = step3Fields.some(field => sceneName.includes(field));
  const isCharacterDetailsMode = sceneName.includes('Character Details');

  // Step 3 (Costume & Fashion) mode
  const isFashionMode = /(Costume|Fashion)/i.test(sceneName);

  // Step 4 fields: Story Structure (full structure) or Individual Plot Point
  const step4Fields = ['Story Structure', 'Structure'];
  const isStructureMode = step4Fields.some(field => sceneName.includes(field));
  const isPlotPointMode = sceneName.includes('Plot Point:');

  // Determine entity name
  const entityNameTh = isIdeaMode
    ? 'Idea'
    : isFashionMode
      ? 'Costume & Fashion'
      : isCharacterMode
        ? 'Character'
        : isStructureMode
          ? 'Story Structure'
          : isPlotPointMode
            ? 'Plot Point'
            : 'ฉาก';

  if (!isOpen) return null;

  const modes = [
    {
      id: 'fresh' as RegenerationMode,
      icon: '🔄',
      title: 'Fresh Start',
      titleTh: 'เริ่มใหม่ทั้งหมด',
      description: isIdeaMode
        ? 'Generate completely new idea from scratch'
        : isFashionMode
          ? 'Generate completely new costume & fashion from scratch'
          : isCharacterMode
            ? 'Generate completely new character from scratch'
            : isStructureMode
              ? 'Generate completely new story structure from scratch'
              : isPlotPointMode
                ? 'Generate completely new plot point description from scratch'
                : 'Generate completely new scene from scratch',
      descriptionTh: `สร้าง${entityNameTh}ใหม่ทั้งหมด ไม่อิงจาก${entityNameTh}เดิม`,
      details: isIdeaMode
        ? [
            'ใช้เฉพาะข้อมูลพื้นฐาน (STEP 1: Genre, story line to be told)',
            `ไม่นำข้อมูล${entityNameTh}เดิม มาพิจารณา`,
            'เหมาะสำหรับ: ต้องการแนวทางใหม่ทั้งหมด',
          ]
        : isFashionMode
          ? [
              'ใช้ข้อมูลพื้นฐานของตัวละคร (STEP 3: Character) เพื่อออกแบบชุดใหม่',
              'ไม่นำ Costume & Fashion เดิม มาพิจารณา',
              'เหมาะสำหรับ: ต้องการลุคใหม่ทั้งหมด',
            ]
          : isCharacterMode
            ? isCharacterDetailsMode
              ? [
                  'ใช้เฉพาะข้อมูลพื้นฐาน (STEP 1, STEP 2, STEP 3 ตัวละครที่มีความเชื่อมโยงกัน)',
                  `ไม่นำข้อมูล${entityNameTh} details เดิม มาพิจารณา`,
                  'เหมาะสำหรับ: ต้องการแนวทางใหม่ทั้งหมด',
                ]
              : [
                  'ใช้เฉพาะข้อมูลพื้นฐาน (STEP 1, STEP 2)',
                  `ไม่นำข้อมูล${entityNameTh}เดิม มาพิจารณา`,
                  'เหมาะสำหรับ: ต้องการแนวทางใหม่ทั้งหมด',
                ]
            : isStructureMode
              ? [
                  'ใช้เฉพาะข้อมูลพื้นฐาน (STEP 1, STEP 2, STEP 3)',
                  `ไม่นำข้อมูล${entityNameTh}เดิม มาพิจารณา`,
                  'กำหนดจำนวน Scenes ในแต่ละ Plot Points ให้มีไดนามิค ตามความเหมาะสม เพื่อสร้าง Story Structure ใหม่ให้ครบถ้วนสมบูรณ์ตามจำนวน Scene ที่กำหนดไว้ตามลำดับ',
                  'เหมาะสำหรับ: ต้องการแนวทางใหม่ทั้งหมด',
                ]
              : isPlotPointMode
                ? [
                    'ใช้เฉพาะข้อมูลพื้นฐาน (STEP 1, STEP 2, STEP 3 และ Plot Points ข้างเคียง)',
                    `สร้าง${entityNameTh}ใหม่ที่เชื่อมโยงกับ Plot Points อื่นๆ อย่างลงตัว`,
                    'กำหนดจำนวน Scenes ที่เหมาะสมสำหรับ Plot Point นี้',
                    'เหมาะสำหรับ: ต้องการแนวทางใหม่สำหรับ Plot Point เฉพาะจุด',
                  ]
                : [
                    'ใช้เฉพาะข้อมูลพื้นฐาน (STEP 1, STEP 2)',
                    `ไม่นำข้อมูล${entityNameTh}เดิม มาพิจารณา`,
                    'เหมาะสำหรับ: ต้องการแนวทางใหม่ทั้งหมด',
                  ],
      color: 'cyan',
      recommended: !hasEdits,
    },
    {
      id: 'refine' as RegenerationMode,
      icon: '✨',
      title: 'Refine Existing',
      titleTh: `ปรับปรุง${entityNameTh}เดิม`,
      description: isIdeaMode
        ? 'Improve current idea while keeping the core structure'
        : isFashionMode
          ? 'Improve current costume & fashion while keeping the core look'
          : isCharacterMode
            ? 'Improve current character while keeping the core structure'
            : isStructureMode
              ? 'Improve current story structure while keeping the core structure'
              : isPlotPointMode
                ? 'Improve current plot point while keeping the core concept'
                : 'Improve current scene while keeping the core structure',
      descriptionTh: `ปรับปรุงคุณภาพ${entityNameTh}เดิม โดยรักษาโครงสร้างหลัก`,
      details: isIdeaMode
        ? [
            `ใช้${entityNameTh}ปัจจุบันเป็นพื้นฐาน`,
            'ปรับปรุง  description, ความเชื่อมโยง,ความสมเหตุสมผล ความสมจริง',
            'เหมาะสำหรับ: ชอบแนวทางแต่ต้องการคุณภาพดีขึ้น',
          ]
        : isFashionMode
          ? [
              'ใช้ Costume & Fashion ปัจจุบันเป็นพื้นฐาน',
              'ปรับปรุงความชัดเจน รายละเอียด ความเข้ากันของชุด สี เครื่องประดับ และรองเท้า',
              'เหมาะสำหรับ: ชอบลุคเดิมแต่ต้องการคุณภาพดีขึ้น',
            ]
          : isCharacterMode
            ? isCharacterDetailsMode
              ? [
                  `ใช้${entityNameTh} details ปัจจุบันเป็นพื้นฐาน`,
                  'ปรับปรุง Character Name, Role/Type, Character Description & Role, External, Internal, Goals, ความเชื่อมโยง, ความสมเหตุสมผล ความสมจริง',
                  'เหมาะสำหรับ: ชอบแนวทางแต่ต้องการคุณภาพดีขึ้น',
                ]
              : [
                  `ใช้${entityNameTh}ปัจจุบันเป็นพื้นฐาน`,
                  'ปรับปรุง Character Name, Role/Type, Character Description & Role, External, Internal, Goals, ความเชื่อมโยง, ความสมเหตุสมผล ความสมจริง',
                  'เหมาะสำหรับ: ชอบแนวทางแต่ต้องการคุณภาพดีขึ้น',
                ]
            : isStructureMode
              ? [
                  `ใช้${entityNameTh}ปัจจุบันเป็นพื้นฐาน`,
                  'ปรับปรุง Description, ความเชื่อมโยง, ความสมเหตุสมผล ความสมจริง ความสนุก ความเข้มข้นครบรส อย่างสมบูรณ์',
                  'เหมาะสำหรับ: ชอบแนวทางแต่ต้องการคุณภาพดีขึ้น',
                ]
              : isPlotPointMode
                ? [
                    `ใช้${entityNameTh} Description ปัจจุบันเป็นพื้นฐาน`,
                    'ปรับปรุงคุณภาพ, ความชัดเจน, ความเชื่อมโยง กับ Plot Points อื่นๆ',
                    'รักษาแนวคิดหลักและความต่อเนื่องของเรื่อง',
                    'เหมาะสำหรับ: ชอบแนวทางแต่ต้องการปรับปรุงคุณภาพ',
                  ]
                : [
                    `ใช้${entityNameTh}ปัจจุบันเป็นพื้นฐาน`,
                    'ปรับปรุงคุณภาพโดยรักษาโครงสร้างหลัก',
                    'เหมาะสำหรับ: ชอบแนวทางแต่ต้องการคุณภาพดีขึ้น',
                  ],
      color: 'purple',
      recommended: !hasEdits && selectedMode !== 'fresh',
    },
    {
      id: 'use-edited' as RegenerationMode,
      icon: '📝',
      title: 'Use Edited Data',
      titleTh: 'ใช้ข้อมูลที่แก้ไข',
      description: 'Regenerate based on your manual edits',
      descriptionTh: `สร้าง${entityNameTh}ใหม่โดยรวมการแก้ไขของคุณเข้าไป`,
      details: isIdeaMode
        ? [
            `นำการแก้ไข${entityNameTh}, STEP 1: Genre, story line to be told, STEP 2: Creating a boundary for the story ไปใช้`,
            `สร้าง${entityNameTh}ใหม่ที่สอดคล้องกับที่แก้ไข`,
            'เหมาะสำหรับ: แก้ไขแล้ว ต้องการ AI สร้างส่วนอื่นให้เข้ากัน',
          ]
        : isFashionMode
          ? [
              'นำการแก้ไข Costume & Fashion ปัจจุบัน ไปใช้',
              'เติมรายละเอียดให้ครบทุกหัวข้อ (รวมรองเท้า) และทำให้ลุคดูเข้ากัน',
              'เหมาะสำหรับ: แก้ไขแล้ว ต้องการ AI จัดชุดให้สมบูรณ์',
            ]
          : isCharacterMode
            ? isCharacterDetailsMode
              ? [
                  `นำการแก้ไข${entityNameTh} details, STEP 1, STEP 2, STEP 3 ข้อมูลปัจจุบัน ไปใช้`,
                  `สร้าง${entityNameTh} details ใหม่ที่สอดคล้องกับที่แก้ไข`,
                  'เหมาะสำหรับ: แก้ไขแล้ว ต้องการ AI สร้างส่วนอื่นให้เข้ากัน',
                ]
              : [
                  `นำการแก้ไข${entityNameTh}, STEP 1, STEP 2, STEP 3 ข้อมูลปัจจุบัน ไปใช้`,
                  `สร้าง${entityNameTh}ใหม่ที่สอดคล้องกับที่แก้ไข`,
                  'เหมาะสำหรับ: แก้ไขแล้ว ต้องการ AI สร้างส่วนอื่นให้เข้ากัน',
                ]
            : isStructureMode
              ? [
                  `นำการแก้ไข${entityNameTh}, STEP 1, STEP 2, STEP 3 ข้อมูลปัจจุบัน ไปใช้`,
                  `สร้าง${entityNameTh}ใหม่ที่สอดคล้องกับที่แก้ไข`,
                  'เหมาะสำหรับ: แก้ไขแล้ว ต้องการ AI สร้างส่วนอื่นให้เข้ากัน',
                ]
              : isPlotPointMode
                ? [
                    `นำการแก้ไข${entityNameTh} Description ที่คุณแก้ไว้แล้วไปใช้`,
                    `สร้าง${entityNameTh}ใหม่ที่สอดคล้องกับการแก้ไข และเชื่อมโยงกับ Plot Points อื่นๆ`,
                    'เหมาะสำหรับ: แก้ไข Description แล้ว ต้องการ AI ปรับปรุงให้สมบูรณ์',
                  ]
                : [
                    `นำการแก้ไข${entityNameTh}ไปใช้`,
                    `สร้าง${entityNameTh}ใหม่ที่สอดคล้องกับที่แก้ไข`,
                    'เหมาะสำหรับ: แก้ไขแล้ว ต้องการ AI สร้างส่วนอื่นให้เข้ากัน',
                  ],
      color: 'green',
      recommended: hasEdits,
      disabled: !hasEdits,
    },
  ];

  const handleConfirm = () => {
    onConfirm(selectedMode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-gray-900 border-2 border-cyan-500/30 rounded-xl shadow-2xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-900/50 to-blue-900/50 border-b border-cyan-500/30 px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-2xl">🔄</span>
                <span>
                  Regenerate{' '}
                  {isIdeaMode
                    ? 'Idea'
                    : isFashionMode
                      ? 'Costume & Fashion'
                      : isCharacterMode
                        ? 'Character'
                        : 'Scene'}
                </span>
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                เลือกวิธีการสร้าง{entityNameTh}:{' '}
                <span className="text-cyan-400 font-semibold">{sceneName}</span>
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="space-y-4">
            {modes.map(mode => {
              const isSelected = selectedMode === mode.id;
              const borderColor = isSelected ? `border-${mode.color}-500` : 'border-gray-700';
              const bgColor = isSelected ? `bg-${mode.color}-900/20` : 'bg-gray-800/50';

              return (
                <button
                  key={mode.id}
                  onClick={() => !mode.disabled && setSelectedMode(mode.id)}
                  disabled={mode.disabled}
                  className={`w-full text-left border-2 rounded-lg p-4 transition-all ${
                    mode.disabled
                      ? 'opacity-40 cursor-not-allowed'
                      : 'hover:border-' + mode.color + '-500 cursor-pointer'
                  } ${isSelected ? borderColor + ' ' + bgColor : 'border-gray-700 bg-gray-800/30'}`}
                >
                  <div className="flex items-start gap-4">
                    {/* Radio Button */}
                    <div className="mt-1 shrink-0">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          isSelected
                            ? `border-${mode.color}-500 bg-${mode.color}-500`
                            : 'border-gray-600'
                        }`}
                      >
                        {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{mode.icon}</span>
                        <div>
                          <h4 className="text-white font-bold">
                            {mode.titleTh}
                            <span className="text-gray-500 text-sm ml-2">({mode.title})</span>
                          </h4>
                          <p className="text-gray-400 text-sm">{mode.descriptionTh}</p>
                        </div>
                        {mode.recommended && (
                          <span className="ml-auto px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-bold rounded-full border border-yellow-500/30">
                            แนะนำ
                          </span>
                        )}
                      </div>

                      {/* Details */}
                      <ul className="space-y-1 mt-3">
                        {mode.details.map((detail, idx) => (
                          <li key={idx} className="text-xs text-gray-400 flex items-start gap-2">
                            <span className="text-cyan-400 mt-0.5">•</span>
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>

                      {mode.disabled && (
                        <div className="mt-3 text-xs text-yellow-500 bg-yellow-900/20 border border-yellow-700/30 rounded px-3 py-2">
                          ⚠️ ไม่พบการแก้ไขใน{entityNameTh}นี้ - ใช้โหมดนี้ไม่ได้
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Info Box */}
          <div className="mt-6 bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
            <div className="flex gap-3">
              <span className="text-blue-400 text-xl">💡</span>
              <div className="text-sm text-gray-300">
                <p className="font-semibold text-blue-300 mb-1">คำแนะนำการใช้งาน:</p>
                <ul className="space-y-1 text-xs text-gray-400">
                  <li>
                    • ถ้าไม่พอใจ {entityNameTh} เลย →{' '}
                    <strong className="text-white">Fresh Start</strong>
                  </li>
                  <li>
                    • ถ้าชอบแนวทางแต่ต้องการดีขึ้น →{' '}
                    <strong className="text-white">Refine Existing</strong>
                  </li>
                  <li>
                    • ถ้าแก้ไขแล้วต้องการให้ AI ขยายความ →{' '}
                    <strong className="text-white">Use Edited Data</strong>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-700 bg-gray-900/50 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleConfirm}
            className={`px-6 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg transition-all font-bold shadow-lg shadow-cyan-500/20`}
          >
            สร้าง {entityNameTh}
          </button>
        </div>
      </div>
    </div>
  );
};
