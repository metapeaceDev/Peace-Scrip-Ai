import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreditsExporter } from './CreditsExporter';
import type { TeamMember } from '../types';

describe('CreditsExporter', () => {
  const mockMembers: TeamMember[] = [
    {
      id: '1',
      name: 'สมชาย ใจดี',
      role: 'Director (ผู้กำกับ)',
      email: 'somchai@example.com',
      share: 30,
      revenueShare: 150000,
    },
    {
      id: '2',
      name: 'สมหญิง สวยงาม',
      role: 'Writer (นักเขียน)',
      email: 'somying@example.com',
      share: 25,
      revenueShare: 125000,
    },
    {
      id: '3',
      name: 'ประเสริฐ เก่งมาก',
      role: 'Developer (นักพัฒนา)',
      email: 'prasert@example.com',
      share: 20,
      revenueShare: 100000,
    },
    {
      id: '4',
      name: 'ศิริพร ช่างฝัน',
      role: 'Art Designer (ศิลป์)',
      email: 'siriporn@example.com',
      share: 15,
      revenueShare: 75000,
    },
    {
      id: '5',
      name: 'วิชัย มั่นคง',
      role: 'Producer (โปรดิวเซอร์)',
      email: 'wichai@example.com',
      share: 10,
      revenueShare: 50000,
    },
  ];

  const defaultProps = {
    members: mockMembers,
    projectTitle: 'My Awesome Film',
  };

  // Mock DOM APIs
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock URL.createObjectURL and revokeObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();

    // Mock window.open
    global.window.open = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render export settings section', () => {
      render(<CreditsExporter {...defaultProps} />);

      expect(screen.getByText('ตั้งค่าการส่งออก')).toBeInTheDocument();
    });

    it('should render project title input', () => {
      render(<CreditsExporter {...defaultProps} />);

      const input = screen.getByDisplayValue('My Awesome Film') as HTMLInputElement;
      expect(input).toBeInTheDocument();
    });

    it('should render category filter', () => {
      render(<CreditsExporter {...defaultProps} />);

      expect(screen.getByText(/ทั้งหมด/)).toBeInTheDocument();
    });

    it('should render format selector', () => {
      render(<CreditsExporter {...defaultProps} />);

      expect(screen.getByText('PDF (Print)')).toBeInTheDocument();
      expect(screen.getByText('HTML')).toBeInTheDocument();
      expect(screen.getByText('Text File')).toBeInTheDocument();
    });

    it('should render revenue checkbox', () => {
      render(<CreditsExporter {...defaultProps} />);

      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox).toBeInTheDocument();
      expect(screen.getByText('รวมข้อมูลส่วนแบ่งรายได้')).toBeInTheDocument();
    });

    it('should render export button', () => {
      render(<CreditsExporter {...defaultProps} />);

      expect(screen.getByText(/ส่งออก PDF/)).toBeInTheDocument();
    });

    it('should render preview section', () => {
      render(<CreditsExporter {...defaultProps} />);

      expect(screen.getByText('ตัวอย่าง')).toBeInTheDocument();
    });

    it('should render tips section', () => {
      render(<CreditsExporter {...defaultProps} />);

      expect(screen.getByText('เคล็ดลับ')).toBeInTheDocument();
    });
  });

  describe('Project Title', () => {
    it('should use default project title', () => {
      render(<CreditsExporter {...defaultProps} />);

      const input = screen.getByDisplayValue('My Awesome Film') as HTMLInputElement;
      expect(input.value).toBe('My Awesome Film');
    });

    it('should update project title on input', () => {
      render(<CreditsExporter {...defaultProps} />);

      const input = screen.getByDisplayValue('My Awesome Film') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'New Film Title' } });

      expect(input.value).toBe('New Film Title');
    });

    it('should handle empty title', () => {
      render(<CreditsExporter {...defaultProps} />);

      const input = screen.getByDisplayValue('My Awesome Film') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '' } });

      expect(input.value).toBe('');
    });
  });

  describe('Category Filter', () => {
    it('should show all members count initially', () => {
      render(<CreditsExporter {...defaultProps} />);

      expect(screen.getByText(/ทั้งหมด \(5\)/)).toBeInTheDocument();
      expect(screen.getByText('5 รายการ')).toBeInTheDocument();
    });

    it('should filter by production team', () => {
      render(<CreditsExporter {...defaultProps} />);

      const select = screen.getByDisplayValue(/ทั้งหมด/) as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'production' } });

      // Director and Producer should be shown (2 members)
      const previewCount = screen.getByText(/รายการ$/);
      expect(previewCount.textContent).toContain('2');
    });

    it('should filter by creative team', () => {
      render(<CreditsExporter {...defaultProps} />);

      const select = screen.getByDisplayValue(/ทั้งหมด/) as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'creative' } });

      // Writer and Designer should be shown (2 members)
      const previewCount = screen.getByText(/รายการ$/);
      expect(previewCount.textContent).toContain('2');
    });

    it('should filter by technical team', () => {
      render(<CreditsExporter {...defaultProps} />);

      const select = screen.getByDisplayValue(/ทั้งหมด/) as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'technical' } });

      // Developer should be shown (1 member)
      const previewCount = screen.getByText(/รายการ$/);
      expect(previewCount.textContent).toContain('1');
    });

    it('should update export button count when filtered', () => {
      render(<CreditsExporter {...defaultProps} />);

      const select = screen.getByDisplayValue(/ทั้งหมด/) as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'production' } });

      expect(screen.getByText(/ส่งออก PDF \(2 รายการ\)/)).toBeInTheDocument();
    });
  });

  describe('Export Format', () => {
    it('should default to PDF format', () => {
      render(<CreditsExporter {...defaultProps} />);

      const select = screen.getByDisplayValue('PDF (Print)') as HTMLSelectElement;
      expect(select.value).toBe('pdf');
    });

    it('should change to HTML format', () => {
      render(<CreditsExporter {...defaultProps} />);

      const select = screen.getByDisplayValue('PDF (Print)') as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'html' } });

      expect(select.value).toBe('html');
      expect(screen.getByText(/ส่งออก HTML/)).toBeInTheDocument();
    });

    it('should change to Text format', () => {
      render(<CreditsExporter {...defaultProps} />);

      const select = screen.getByDisplayValue('PDF (Print)') as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'text' } });

      expect(select.value).toBe('text');
      expect(screen.getByText(/ส่งออก TEXT/)).toBeInTheDocument();
    });

    it('should show iframe for HTML preview', () => {
      render(<CreditsExporter {...defaultProps} />);

      const select = screen.getByDisplayValue('PDF (Print)') as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'html' } });

      const iframe = document.querySelector('iframe');
      expect(iframe).toBeInTheDocument();
      expect(iframe?.title).toBe('HTML Preview');
    });

    it('should show text preview for text format', () => {
      render(<CreditsExporter {...defaultProps} />);

      const select = screen.getByDisplayValue('PDF (Print)') as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'text' } });

      const pre = document.querySelector('pre');
      expect(pre).toBeInTheDocument();
      expect(pre?.className).toContain('whitespace-pre-wrap');
    });
  });

  describe('Revenue Checkbox', () => {
    it('should be unchecked by default', () => {
      render(<CreditsExporter {...defaultProps} />);

      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
    });

    it('should toggle revenue inclusion', () => {
      render(<CreditsExporter {...defaultProps} />);

      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      fireEvent.click(checkbox);

      expect(checkbox.checked).toBe(true);
    });

    it('should uncheck when clicked again', () => {
      render(<CreditsExporter {...defaultProps} />);

      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      fireEvent.click(checkbox);
      fireEvent.click(checkbox);

      expect(checkbox.checked).toBe(false);
    });
  });

  describe('Export Button', () => {
    it('should be enabled when members exist', () => {
      render(<CreditsExporter {...defaultProps} />);

      const button = screen.getByText(/ส่งออก PDF/).closest('button') as HTMLButtonElement;
      expect(button.disabled).toBe(false);
    });

    it('should be disabled when no members after filter', () => {
      const emptyProps = { ...defaultProps, members: [] };
      render(<CreditsExporter {...emptyProps} />);

      const button = screen.getByText(/ส่งออก PDF/).closest('button') as HTMLButtonElement;
      expect(button.disabled).toBe(true);
    });

    it('should export text file when clicked', () => {
      render(<CreditsExporter {...defaultProps} />);

      const select = screen.getByDisplayValue('PDF (Print)') as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'text' } });

      const button = screen.getByText(/ส่งออก TEXT/);
      fireEvent.click(button);

      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });

    it('should export HTML file when clicked', () => {
      render(<CreditsExporter {...defaultProps} />);

      const select = screen.getByDisplayValue('PDF (Print)') as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'html' } });

      const button = screen.getByText(/ส่งออก HTML/);
      fireEvent.click(button);

      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });

    it('should open print window for PDF', () => {
      render(<CreditsExporter {...defaultProps} />);

      const button = screen.getByText(/ส่งออก PDF/);
      fireEvent.click(button);

      expect(global.window.open).toHaveBeenCalledWith('', '_blank');
    });
  });

  describe('Preview Section', () => {
    it('should show member count', () => {
      render(<CreditsExporter {...defaultProps} />);

      expect(screen.getByText('5 รายการ')).toBeInTheDocument();
    });

    it('should show empty state when no members', () => {
      const emptyProps = { ...defaultProps, members: [] };
      render(<CreditsExporter {...emptyProps} />);

      expect(screen.getByText('ไม่มีข้อมูลที่จะแสดง')).toBeInTheDocument();
      expect(screen.getByText('ลองเปลี่ยนหมวดหมู่หรือเพิ่มสมาชิกในทีม')).toBeInTheDocument();
    });

    it('should show empty state when filter returns no results', () => {
      const singleMemberProps = {
        ...defaultProps,
        members: [mockMembers[0]], // Only director
      };
      render(<CreditsExporter {...singleMemberProps} />);

      const select = screen.getByDisplayValue(/ทั้งหมด/) as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'technical' } });

      expect(screen.getByText('ไม่มีข้อมูลที่จะแสดง')).toBeInTheDocument();
    });
  });

  describe('Text Generation', () => {
    it('should generate text with project title', () => {
      render(<CreditsExporter {...defaultProps} />);

      const select = screen.getByDisplayValue('PDF (Print)') as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'text' } });

      const pre = document.querySelector('pre');
      expect(pre?.textContent).toContain('My Awesome Film');
    });

    it('should generate text with member names and roles', () => {
      render(<CreditsExporter {...defaultProps} />);

      const select = screen.getByDisplayValue('PDF (Print)') as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'text' } });

      const pre = document.querySelector('pre');
      expect(pre?.textContent).toContain('สมชาย ใจดี');
      expect(pre?.textContent).toContain('Director (ผู้กำกับ)');
    });

    it('should include emails in text', () => {
      render(<CreditsExporter {...defaultProps} />);

      const select = screen.getByDisplayValue('PDF (Print)') as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'text' } });

      const pre = document.querySelector('pre');
      expect(pre?.textContent).toContain('somchai@example.com');
    });

    it('should include revenue when checkbox checked', () => {
      render(<CreditsExporter {...defaultProps} />);

      const formatSelect = screen.getByDisplayValue('PDF (Print)') as HTMLSelectElement;
      fireEvent.change(formatSelect, { target: { value: 'text' } });

      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      fireEvent.click(checkbox);

      const pre = document.querySelector('pre');
      expect(pre?.textContent).toContain('150,000');
    });

    it('should not include revenue when checkbox unchecked', () => {
      render(<CreditsExporter {...defaultProps} />);

      const select = screen.getByDisplayValue('PDF (Print)') as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'text' } });

      const pre = document.querySelector('pre');
      expect(pre?.textContent).not.toContain('Revenue Share');
    });

    it('should show total credits count', () => {
      render(<CreditsExporter {...defaultProps} />);

      const select = screen.getByDisplayValue('PDF (Print)') as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'text' } });

      const pre = document.querySelector('pre');
      expect(pre?.textContent).toContain('Total Credits: 5');
    });

    it('should include generation date', () => {
      render(<CreditsExporter {...defaultProps} />);

      const select = screen.getByDisplayValue('PDF (Print)') as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'text' } });

      const pre = document.querySelector('pre');
      expect(pre?.textContent).toContain('Generated:');
    });
  });

  describe('HTML Generation', () => {
    it('should generate HTML with project title', () => {
      render(<CreditsExporter {...defaultProps} />);

      const select = screen.getByDisplayValue('PDF (Print)') as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'html' } });

      const iframe = document.querySelector('iframe');
      expect(iframe?.getAttribute('srcdoc')).toContain('My Awesome Film');
    });

    it('should generate HTML with styles', () => {
      render(<CreditsExporter {...defaultProps} />);

      const select = screen.getByDisplayValue('PDF (Print)') as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'html' } });

      const iframe = document.querySelector('iframe');
      expect(iframe?.getAttribute('srcdoc')).toContain('<style>');
      expect(iframe?.getAttribute('srcdoc')).toContain('gradient');
    });

    it('should generate HTML with member cards', () => {
      render(<CreditsExporter {...defaultProps} />);

      const select = screen.getByDisplayValue('PDF (Print)') as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'html' } });

      const iframe = document.querySelector('iframe');
      const srcDoc = iframe?.getAttribute('srcdoc') || '';
      expect(srcDoc).toContain('credit-item');
      expect(srcDoc).toContain('สมชาย ใจดี');
    });

    it('should include revenue in HTML when checked', () => {
      render(<CreditsExporter {...defaultProps} />);

      const formatSelect = screen.getByDisplayValue('PDF (Print)') as HTMLSelectElement;
      fireEvent.change(formatSelect, { target: { value: 'html' } });

      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      fireEvent.click(checkbox);

      const iframe = document.querySelector('iframe');
      const srcDoc = iframe?.getAttribute('srcdoc') || '';
      expect(srcDoc).toContain('💰');
      expect(srcDoc).toContain('150,000');
    });

    it('should have responsive meta tags', () => {
      render(<CreditsExporter {...defaultProps} />);

      const select = screen.getByDisplayValue('PDF (Print)') as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'html' } });

      const iframe = document.querySelector('iframe');
      const srcDoc = iframe?.getAttribute('srcdoc') || '';
      expect(srcDoc).toContain('viewport');
      expect(srcDoc).toContain('charset="UTF-8"');
    });
  });

  describe('File Download', () => {
    it('should create blob for text file', () => {
      render(<CreditsExporter {...defaultProps} />);

      const select = screen.getByDisplayValue('PDF (Print)') as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'text' } });

      const button = screen.getByText(/ส่งออก TEXT/);
      fireEvent.click(button);

      expect(global.URL.createObjectURL).toHaveBeenCalled();
      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    });

    it('should create blob for HTML file', () => {
      render(<CreditsExporter {...defaultProps} />);

      const select = screen.getByDisplayValue('PDF (Print)') as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'html' } });

      const button = screen.getByText(/ส่งออก HTML/);
      fireEvent.click(button);

      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });

    it('should generate filename with project title', () => {
      render(<CreditsExporter {...defaultProps} />);

      const titleInput = screen.getByDisplayValue('My Awesome Film') as HTMLInputElement;
      fireEvent.change(titleInput, { target: { value: 'Test_Project_2024' } });

      // Mock just before triggering download
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
        setAttribute: vi.fn(),
        getAttribute: vi.fn(),
      };
      const originalCreateElement = document.createElement.bind(document);
      const createElementSpy = vi
        .spyOn(document, 'createElement')
        .mockImplementation((tag: string) => {
          if (tag === 'a') return mockLink as any;
          return originalCreateElement(tag);
        });
      const appendChildSpy = vi
        .spyOn(document.body, 'appendChild')
        .mockImplementation(() => null as any);
      const removeChildSpy = vi
        .spyOn(document.body, 'removeChild')
        .mockImplementation(() => null as any);

      const select = screen.getByDisplayValue('PDF (Print)') as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'text' } });

      const button = screen.getByText(/ส่งออก TEXT/);
      fireEvent.click(button);

      // Verify download filename includes sanitized project title
      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(mockLink.download).toContain('Test_Project_2024');
      expect(mockLink.download).toContain('.txt');

      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });

    it('should generate filename with date', () => {
      const dateSpy = vi
        .spyOn(Date.prototype, 'toISOString')
        .mockReturnValue('2024-01-15T12:00:00Z');

      render(<CreditsExporter {...defaultProps} />);

      const select = screen.getByDisplayValue('PDF (Print)') as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'text' } });

      const button = screen.getByText(/ส่งออก TEXT/);
      fireEvent.click(button);

      expect(dateSpy).toHaveBeenCalled();
      dateSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle members without email', () => {
      const membersNoEmail = [{ ...mockMembers[0], email: undefined }];
      render(<CreditsExporter {...defaultProps} members={membersNoEmail} />);

      const select = screen.getByDisplayValue('PDF (Print)') as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'text' } });

      const pre = document.querySelector('pre');
      expect(pre).toBeInTheDocument();
    });

    it('should handle members without revenue share', () => {
      const membersNoRevenue = [{ ...mockMembers[0], revenueShare: undefined }];
      render(<CreditsExporter {...defaultProps} members={membersNoRevenue} />);

      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      fireEvent.click(checkbox);

      const select = screen.getByDisplayValue('PDF (Print)') as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'text' } });

      const pre = document.querySelector('pre');
      expect(pre).toBeInTheDocument();
    });

    it('should handle special characters in project title', () => {
      render(<CreditsExporter {...defaultProps} />);

      const input = screen.getByDisplayValue('My Awesome Film') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'Test@#$%Project!' } });

      const select = screen.getByDisplayValue('PDF (Print)') as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'text' } });

      const button = screen.getByText(/ส่งออก TEXT/);
      fireEvent.click(button);

      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });

    it('should handle very long project title', () => {
      render(<CreditsExporter {...defaultProps} />);

      const longTitle = 'A'.repeat(200);
      const input = screen.getByDisplayValue('My Awesome Film') as HTMLInputElement;
      fireEvent.change(input, { target: { value: longTitle } });

      expect(input.value).toBe(longTitle);
    });

    it('should handle single member', () => {
      const singleMemberProps = { ...defaultProps, members: [mockMembers[0]] };
      render(<CreditsExporter {...singleMemberProps} />);

      expect(screen.getByText('1 รายการ')).toBeInTheDocument();
      expect(screen.getByText(/ส่งออก PDF \(1 รายการ\)/)).toBeInTheDocument();
    });

    it('should handle large member list', () => {
      const largeMemberList = Array.from({ length: 100 }, (_, i) => ({
        ...mockMembers[0],
        id: `member-${i}`,
        name: `Member ${i}`,
      }));

      render(<CreditsExporter {...defaultProps} members={largeMemberList} />);

      expect(screen.getByText('100 รายการ')).toBeInTheDocument();
    });
  });

  describe('Tips Section', () => {
    it('should show PDF tip', () => {
      render(<CreditsExporter {...defaultProps} />);

      expect(screen.getByText(/PDF: เปิดหน้าต่างพิมพ์ใหม่/)).toBeInTheDocument();
    });

    it('should show HTML tip', () => {
      render(<CreditsExporter {...defaultProps} />);

      expect(screen.getByText(/HTML: สามารถเปิดในเบราว์เซอร์/)).toBeInTheDocument();
    });

    it('should show Text tip', () => {
      render(<CreditsExporter {...defaultProps} />);

      expect(screen.getByText(/Text: เหมาะสำหรับนำไปใช้งานต่อ/)).toBeInTheDocument();
    });
  });
});
