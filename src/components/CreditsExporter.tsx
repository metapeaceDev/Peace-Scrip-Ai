import React, { useState } from 'react';
import type { TeamMember } from '../../types';

interface CreditsExporterProps {
  members: TeamMember[];
  projectTitle: string;
}

type CreditCategory = 'all' | 'production' | 'creative' | 'technical';
type ExportFormat = 'pdf' | 'html' | 'text';

export const CreditsExporter: React.FC<CreditsExporterProps> = ({ members, projectTitle }) => {
  const [category, setCategory] = useState<CreditCategory>('all');
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [customTitle, setCustomTitle] = useState(projectTitle);
  const [includeRevenue, setIncludeRevenue] = useState(false);

  const getCategorizedMembers = () => {
    if (category === 'all') return members;

    const categoryKeywords: { [key in Exclude<CreditCategory, 'all'>]: string[] } = {
      production: ['producer', 'director', 'production', 'โปรดิวเซอร์', 'ผู้กำกับ'],
      creative: ['writer', 'designer', 'art', 'นักเขียน', 'ดีไซเนอร์', 'ศิลป์'],
      technical: ['developer', 'engineer', 'technical', 'นักพัฒนา', 'วิศวกร', 'เทคนิค'],
    };

    return members.filter(member => {
      const role = member.role.toLowerCase();
      return categoryKeywords[category as Exclude<CreditCategory, 'all'>].some(keyword =>
        role.includes(keyword.toLowerCase())
      );
    });
  };

  const generateTextCredits = () => {
    const filteredMembers = getCategorizedMembers();
    let text = `${customTitle}\n`;
    text += '='.repeat(customTitle.length) + '\n\n';
    text += 'Film Credits\n\n';

    filteredMembers.forEach(member => {
      text += `${member.role}: ${member.name}\n`;
      if (member.email) text += `  Email: ${member.email}\n`;
      if (includeRevenue && member.revenueShare) {
        text += `  Revenue Share: ฿${member.revenueShare.toLocaleString('th-TH')}\n`;
      }
      text += '\n';
    });

    text += `\nTotal Credits: ${filteredMembers.length}\n`;
    text += `Generated: ${new Date().toLocaleString('th-TH')}\n`;

    return text;
  };

  const generateHTMLCredits = () => {
    const filteredMembers = getCategorizedMembers();

    return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${customTitle} - Credits</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 40px 20px;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 60px 40px;
      text-align: center;
    }
    .header h1 {
      font-size: 48px;
      font-weight: 800;
      margin-bottom: 10px;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
    }
    .header p {
      font-size: 18px;
      opacity: 0.9;
    }
    .credits {
      padding: 40px;
    }
    .credit-item {
      margin-bottom: 30px;
      padding: 25px;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      border-radius: 12px;
      border-left: 5px solid #667eea;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .credit-item:hover {
      transform: translateX(5px);
      box-shadow: 0 5px 15px rgba(102, 126, 234, 0.3);
    }
    .role {
      font-size: 14px;
      text-transform: uppercase;
      color: #667eea;
      font-weight: 700;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }
    .name {
      font-size: 28px;
      font-weight: 800;
      color: #2d3748;
      margin-bottom: 8px;
    }
    .contact {
      font-size: 14px;
      color: #718096;
      margin-top: 8px;
    }
    .revenue {
      font-size: 16px;
      color: #48bb78;
      font-weight: 600;
      margin-top: 8px;
    }
    .footer {
      padding: 30px 40px;
      background: #f7fafc;
      border-top: 2px solid #e2e8f0;
      text-align: center;
      color: #718096;
      font-size: 14px;
    }
    @media print {
      body {
        background: white;
        padding: 0;
      }
      .container {
        box-shadow: none;
      }
      .credit-item:hover {
        transform: none;
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${customTitle}</h1>
      <p>Film Credits</p>
    </div>
    <div class="credits">
      ${filteredMembers
        .map(
          member => `
        <div class="credit-item">
          <div class="role">${member.role}</div>
          <div class="name">${member.name}</div>
          ${member.email ? `<div class="contact">📧 ${member.email}</div>` : ''}
          ${
            includeRevenue && member.revenueShare
              ? `<div class="revenue">💰 ฿${member.revenueShare.toLocaleString('th-TH')}</div>`
              : ''
          }
        </div>
      `
        )
        .join('')}
    </div>
    <div class="footer">
      <p>Total: ${filteredMembers.length} Credits</p>
      <p>Generated on ${new Date().toLocaleString('th-TH')}</p>
    </div>
  </div>
</body>
</html>`;
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    const timestamp = new Date().toISOString().split('T')[0];
    const baseFilename = `${customTitle.replace(/[^a-zA-Z0-9]/g, '_')}_credits_${timestamp}`;

    if (format === 'text') {
      const content = generateTextCredits();
      downloadFile(content, `${baseFilename}.txt`, 'text/plain');
    } else if (format === 'html') {
      const content = generateHTMLCredits();
      downloadFile(content, `${baseFilename}.html`, 'text/html');
    } else if (format === 'pdf') {
      // For PDF, we'll open HTML in new window and let user print to PDF
      const content = generateHTMLCredits();
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(content);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.print();
        }, 500);
      }
    }
  };

  const filteredMembers = getCategorizedMembers();
  const previewContent = format === 'html' ? generateHTMLCredits() : generateTextCredits();

  return (
    <div className="space-y-6">
      {/* Export Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">ตั้งค่าการส่งออก</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Project Title */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">ชื่อโปรเจค</label>
            <input
              type="text"
              value={customTitle}
              onChange={e => setCustomTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="ชื่อโปรเจค"
            />
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">หมวดหมู่</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as CreditCategory)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">ทั้งหมด ({members.length})</option>
              <option value="production">Production Team</option>
              <option value="creative">Creative Team</option>
              <option value="technical">Technical Team</option>
            </select>
          </div>

          {/* Export Format */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">รูปแบบไฟล์</label>
            <select
              value={format}
              onChange={e => setFormat(e.target.value as ExportFormat)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="pdf">PDF (Print)</option>
              <option value="html">HTML</option>
              <option value="text">Text File</option>
            </select>
          </div>

          {/* Include Revenue */}
          <div className="md:col-span-2">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includeRevenue}
                onChange={e => setIncludeRevenue(e.target.checked)}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">รวมข้อมูลส่วนแบ่งรายได้</span>
            </label>
          </div>
        </div>

        {/* Export Button */}
        <div className="mt-6">
          <button
            onClick={handleExport}
            disabled={filteredMembers.length === 0}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed font-medium shadow-lg hover:shadow-xl"
          >
            <span className="flex items-center justify-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              <span>
                ส่งออก {format.toUpperCase()} ({filteredMembers.length} รายการ)
              </span>
            </span>
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">ตัวอย่าง</h3>
          <span className="text-sm text-gray-500">{filteredMembers.length} รายการ</span>
        </div>

        <div className="p-6">
          {filteredMembers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <svg
                className="w-16 h-16 mx-auto mb-4 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p>ไม่มีข้อมูลที่จะแสดง</p>
              <p className="text-sm mt-1">ลองเปลี่ยนหมวดหมู่หรือเพิ่มสมาชิกในทีม</p>
            </div>
          ) : format === 'html' ? (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <iframe
                srcDoc={previewContent}
                className="w-full h-96 border-0"
                title="HTML Preview"
                sandbox="allow-same-origin"
              />
            </div>
          ) : (
            <div className="bg-gray-900 text-green-400 p-6 rounded-lg font-mono text-sm overflow-auto max-h-96">
              <pre className="whitespace-pre-wrap">{previewContent}</pre>
            </div>
          )}
        </div>
      </div>

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <svg
            className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-blue-800 mb-1">เคล็ดลับ</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• PDF: เปิดหน้าต่างพิมพ์ใหม่ เลือก "Save as PDF" จากเครื่องพิมพ์</li>
              <li>• HTML: สามารถเปิดในเบราว์เซอร์และแก้ไขเพิ่มเติมได้</li>
              <li>• Text: เหมาะสำหรับนำไปใช้งานต่อในโปรแกรมอื่น</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
