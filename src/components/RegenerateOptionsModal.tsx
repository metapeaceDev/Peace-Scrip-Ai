import React, { useState } from 'react';

export type RegenerationMode = 'fresh' | 'refine' | 'use-edited';

export type ContentType = 'boundary' | 'characters' | 'structure' | 'scenes';

interface RegenerateOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (mode: RegenerationMode) => void;
  contentType: ContentType; // 'boundary', 'characters', 'structure', 'scenes'
  contentName: string; // e.g., "Opening Image", "Step 2: Boundary", "Main Character"
  hasEdits: boolean;
}

export const RegenerateOptionsModal: React.FC<RegenerateOptionsModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  contentType,
  contentName,
  hasEdits,
}) => {
  const [selectedMode, setSelectedMode] = useState<RegenerationMode>('fresh');

  if (!isOpen) return null;

  // Dynamic content based on type
  const getContentLabel = () => {
    switch (contentType) {
      case 'boundary':
        return {
          title: 'Creating a boundary for the story',
          titleTh: 'สร้าง Boundary (ขอบเขตเรื่อง)',
          freshDetails: [
            'ใช้เฉพาะข้อมูลพื้นฐาน (STEP 1: Genre, story line to be told)',
            'ไม่นำคำตอบเดิมมาพิจารณา',
            'เหมาะสำหรับ: ต้องการแนวทางใหม่ทั้งหมด แปลกใหม่ แตกต่าง',
          ],
          refineDetails: [
            'ใช้ข้อมูลปัจจุบันเป็นพื้นฐาน',
            'ปรับปรุง Big Idea, Premise, Theme, LogLine ให้ดีและสมบูรณ์แบบยิ่งขึ้น',
            'เหมาะสำหรับ: ชอบแนวทางแต่ต้องการคุณภาพดีขึ้น',
          ],
          useEditedDetails: [
            'นำการแก้ไข และอัพเดตล่าสุด',
            'มาสร้างต่อยอด สอดคล้องกับที่แก้ไข ให้สมบูรณ์',
            'เหมาะสำหรับ: แก้ไขแล้ว ต้องการ AI สร้างส่วนอื่นให้เข้ากัน',
          ],
        };
      case 'characters':
        return {
          title: 'Generating Characters',
          titleTh: 'สร้างตัวละคร',
          freshDetails: [
            'ใช้เฉพาะข้อมูลพื้นฐาน (Genre, Boundary, Structure)',
            'ไม่นำตัวละครเดิมมาพิจารณา',
            'เหมาะสำหรับ: ต้องการตัวละครใหม่ทั้งหมด',
          ],
          refineDetails: [
            'ใช้ตัวละครปัจจุบันเป็นพื้นฐาน',
            'ปรับปรุง backstory, goals, personality ให้ลึกซึ้งขึ้น',
            'เหมาะสำหรับ: ชอบตัวละครแต่ต้องการพัฒนาต่อ',
          ],
          useEditedDetails: [
            'นำการแก้ไขตัวละคร (ชื่อ, บุคลิก, เป้าหมาย)',
            'มาสร้างรายละเอียดอื่นให้สอดคล้อง',
            'เหมาะสำหรับ: แก้ไขตัวละครแล้ว ต้องการ AI เติมเต็ม',
          ],
        };
      case 'structure':
        return {
          title: 'Building Story Structure',
          titleTh: 'สร้างโครงสร้างเรื่อง (9 Plot Points)',
          freshDetails: [
            'ใช้เฉพาะข้อมูลพื้นฐาน (Boundary, Characters)',
            'ไม่นำโครงสร้างเดิมมาพิจารณา',
            'เหมาะสำหรับ: ต้องการเปลี่ยนโครงเรื่องใหม่หมด',
          ],
          refineDetails: [
            'ใช้โครงสร้างปัจจุบันเป็นพื้นฐาน',
            'ปรับปรุงคำอธิบายแต่ละ Plot Point ให้ชัดเจนขึ้น',
            'เหมาะสำหรับ: ชอบโครงเรื่องแต่ต้องการรายละเอียดดีขึ้น',
          ],
          useEditedDetails: [
            'นำการแก้ไข Plot Points',
            'มาสร้างรายละเอียดให้เชื่อมโยงกันดี',
            'เหมาะสำหรับ: แก้ไขโครงเรื่องแล้ว ต้องการ AI ขยายความ',
          ],
        };
      case 'scenes':
      default:
        return {
          title: 'Regenerate Scene',
          titleTh: 'สร้างฉาก',
          freshDetails: [
            'ใช้เฉพาะข้อมูลพื้นฐาน (Plot Point, Characters, Previous Scenes)',
            'ไม่นำข้อมูลฉากเดิมมาพิจารณา',
            'เหมาะสำหรับ: ต้องการแนวทางใหม่ทั้งหมด',
          ],
          refineDetails: [
            'ใช้ฉากปัจจุบันเป็นพื้นฐาน',
            'ปรับปรุง dialogue, description, ความสมจริง',
            'เหมาะสำหรับ: ชอบแนวทางแต่ต้องการคุณภาพดีขึ้น',
          ],
          useEditedDetails: [
            'นำการแก้ไข dialogue, description, characters ไปใช้',
            'สร้างฉากใหม่ที่สอดคล้องกับที่แก้ไข',
            'เหมาะสำหรับ: แก้ไขแล้ว ต้องการ AI สร้างส่วนอื่นให้เข้ากัน',
          ],
        };
    }
  };

  const labels = getContentLabel();

  const modes = [
    {
      id: 'fresh' as RegenerationMode,
      icon: '🔄',
      title: 'Fresh Start',
      titleTh: 'เริ่มใหม่ทั้งหมด',
      description: 'Generate completely new content from scratch',
      descriptionTh: 'สร้างใหม่ทั้งหมด ไม่อิงจากข้อมูลเดิม',
      details: labels.freshDetails,
      color: 'cyan',
      recommended: !hasEdits,
    },
    {
      id: 'refine' as RegenerationMode,
      icon: '✨',
      title: 'Refine Existing',
      titleTh: 'ปรับปรุงข้อมูลเดิม',
      description: 'Improve current content while keeping the core structure',
      descriptionTh: 'ปรับปรุงคุณภาพ โดยรักษาโครงสร้างหลัก',
      details: labels.refineDetails,
      color: 'purple',
      recommended: !hasEdits && selectedMode !== 'fresh',
    },
    {
      id: 'use-edited' as RegenerationMode,
      icon: '📝',
      title: 'Use Edited Data',
      titleTh: 'ใช้ข้อมูลที่แก้ไข',
      description: 'Regenerate based on your manual edits',
      descriptionTh: 'สร้างใหม่โดยรวมการแก้ไขของคุณเข้าไป',
      details: labels.useEditedDetails,
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
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-gray-900 border-2 border-cyan-500/30 rounded-xl shadow-2xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-900/50 to-blue-900/50 border-b border-cyan-500/30 px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-2xl">🔄</span>
                <span>{labels.title}</span>
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                {labels.titleTh}: <span className="text-cyan-400 font-semibold">{contentName}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
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
              const borderColor = isSelected
                ? `border-${mode.color}-500`
                : 'border-gray-700';
              const bgColor = isSelected
                ? `bg-${mode.color}-900/20`
                : 'bg-gray-800/50';

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
                        {isSelected && (
                          <div className="w-2.5 h-2.5 bg-white rounded-full" />
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{mode.icon}</span>
                        <div>
                          <h4 className="text-white font-bold">
                            {mode.titleTh}
                            <span className="text-gray-500 text-sm ml-2">
                              ({mode.title})
                            </span>
                          </h4>
                          <p className="text-gray-400 text-sm">
                            {mode.descriptionTh}
                          </p>
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
                          <li
                            key={idx}
                            className="text-xs text-gray-400 flex items-start gap-2"
                          >
                            <span className="text-cyan-400 mt-0.5">•</span>
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>

                      {mode.disabled && (
                        <div className="mt-3 text-xs text-yellow-500 bg-yellow-900/20 border border-yellow-700/30 rounded px-3 py-2">
                          ⚠️ ไม่พบการแก้ไขในฉากนี้ - ใช้โหมดนี้ไม่ได้
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
                <p className="font-semibold text-blue-300 mb-1">
                  คำแนะนำการใช้งาน:
                </p>
                <ul className="space-y-1 text-xs text-gray-400">
                  <li>• ถ้าไม่พอใจฉากเลย → <strong className="text-white">Fresh Start</strong></li>
                  <li>• ถ้าชอบแนวทางแต่ต้องการดีขึ้น → <strong className="text-white">Refine Existing</strong></li>
                  <li>• ถ้าแก้ไขแล้วต้องการให้ AI ขยายความ → <strong className="text-white">Use Edited Data</strong></li>
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
            {contentType === 'scenes' ? 'สร้างฉาก' : 'สร้างใหม่'}
          </button>
        </div>
      </div>
    </div>
  );
};
