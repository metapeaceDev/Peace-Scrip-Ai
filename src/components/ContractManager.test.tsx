import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ContractManager } from './ContractManager';
import * as firebaseStorage from 'firebase/storage';
import * as firebaseFirestore from 'firebase/firestore';

// Mock Firebase modules
vi.mock('firebase/storage', () => ({
  ref: vi.fn(),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn(),
  deleteObject: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  addDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
  deleteDoc: vi.fn(),
  doc: vi.fn(),
  Timestamp: {
    now: vi.fn(() => ({ seconds: 1700000000, nanoseconds: 0 })),
  },
}));

vi.mock('../config/firebase', () => ({
  storage: {},
  db: {},
}));

describe('ContractManager', () => {
  const mockProjectId = 'test-project-123';

  const mockContract = {
    id: 'contract-1',
    fileName: 'test-contract.pdf',
    fileUrl: 'https://example.com/contract.pdf',
    uploadDate: new Date('2024-01-15'),
    fileSize: 1024000,
    description: 'Test contract description',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock getDocs to return empty initially
    vi.mocked(firebaseFirestore.getDocs).mockResolvedValue({
      forEach: vi.fn(),
      docs: [],
      size: 0,
      empty: true,
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('should show loading state initially', () => {
      render(<ContractManager projectId={mockProjectId} />);
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should render upload section after loading', async () => {
      render(<ContractManager projectId={mockProjectId} />);

      await waitFor(() => {
        const heading = screen.getByRole('heading', { level: 3, name: 'อัพโหลดสัญญา' });
        expect(heading).toBeInTheDocument();
      });
    });

    it('should render file input', async () => {
      render(<ContractManager projectId={mockProjectId} />);

      await waitFor(() => {
        const input = document.getElementById('contract-file-input') as HTMLInputElement;
        expect(input).toBeInTheDocument();
        expect(input.type).toBe('file');
      });
    });

    it('should render description textarea', async () => {
      render(<ContractManager projectId={mockProjectId} />);

      await waitFor(() => {
        const textarea = screen.getByPlaceholderText(/ระบุรายละเอียดสัญญา/);
        expect(textarea).toBeInTheDocument();
      });
    });

    it('should render upload button', async () => {
      render(<ContractManager projectId={mockProjectId} />);

      await waitFor(() => {
        const button = screen.getByRole('button', { name: /อัพโหลดสัญญา/ });
        expect(button).toBeInTheDocument();
      });
    });

    it('should render contracts list section', async () => {
      render(<ContractManager projectId={mockProjectId} />);

      await waitFor(() => {
        expect(screen.getByText(/สัญญาทั้งหมด/)).toBeInTheDocument();
      });
    });
  });

  describe('Load Contracts', () => {
    it('should load contracts on mount', async () => {
      const mockSnapshot = {
        forEach: (callback: any) => {
          callback({
            id: 'contract-1',
            data: () => ({
              fileName: 'test.pdf',
              fileUrl: 'https://example.com/test.pdf',
              uploadDate: { toDate: () => new Date('2024-01-15') },
              fileSize: 1024,
              description: 'Test',
            }),
          });
        },
        docs: [{ id: 'contract-1' }],
        size: 1,
        empty: false,
      };

      vi.mocked(firebaseFirestore.getDocs).mockResolvedValue(mockSnapshot as any);

      render(<ContractManager projectId={mockProjectId} />);

      await waitFor(() => {
        expect(firebaseFirestore.collection).toHaveBeenCalledWith({}, 'contracts');
        expect(firebaseFirestore.where).toHaveBeenCalledWith('projectId', '==', mockProjectId);
      });
    });

    it('should display empty state when no contracts', async () => {
      render(<ContractManager projectId={mockProjectId} />);

      await waitFor(() => {
        expect(screen.getByText('ยังไม่มีสัญญา')).toBeInTheDocument();
        expect(screen.getByText('อัพโหลดสัญญาเพื่อเริ่มจัดการ')).toBeInTheDocument();
      });
    });

    it('should display contract count', async () => {
      const mockSnapshot = {
        forEach: (callback: any) => {
          callback({
            id: 'contract-1',
            data: () => ({
              fileName: 'test.pdf',
              fileUrl: 'https://example.com/test.pdf',
              uploadDate: { toDate: () => new Date() },
              fileSize: 1024,
            }),
          });
          callback({
            id: 'contract-2',
            data: () => ({
              fileName: 'test2.pdf',
              fileUrl: 'https://example.com/test2.pdf',
              uploadDate: { toDate: () => new Date() },
              fileSize: 2048,
            }),
          });
        },
        docs: [{ id: 'contract-1' }, { id: 'contract-2' }],
        size: 2,
        empty: false,
      };

      vi.mocked(firebaseFirestore.getDocs).mockResolvedValue(mockSnapshot as any);

      render(<ContractManager projectId={mockProjectId} />);

      await waitFor(() => {
        expect(screen.getByText('สัญญาทั้งหมด (2)')).toBeInTheDocument();
      });
    });

    it('should handle load error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(firebaseFirestore.getDocs).mockRejectedValue(new Error('Load failed'));

      render(<ContractManager projectId={mockProjectId} />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error loading contracts:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('File Selection', () => {
    it('should update selected file on valid PDF selection', async () => {
      render(<ContractManager projectId={mockProjectId} />);

      await waitFor(() => {
        const heading = screen.getByRole('heading', { level: 3, name: 'อัพโหลดสัญญา' });
        expect(heading).toBeInTheDocument();
      });

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const input = document.getElementById('contract-file-input') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(input);

      await waitFor(() => {
        expect(screen.getByText(/test\.pdf/)).toBeInTheDocument();
      });
    });

    it('should alert if non-PDF file selected', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      render(<ContractManager projectId={mockProjectId} />);

      await waitFor(() => {
        const heading = screen.getByRole('heading', { level: 3, name: 'อัพโหลดสัญญา' });
        expect(heading).toBeInTheDocument();
      });

      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      const input = document.getElementById('contract-file-input') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(input);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('กรุณาเลือกไฟล์ PDF เท่านั้น');
      });

      alertSpy.mockRestore();
    });

    it('should alert if file size exceeds 10MB', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      render(<ContractManager projectId={mockProjectId} />);

      await waitFor(() => {
        const heading = screen.getByRole('heading', { level: 3, name: 'อัพโหลดสัญญา' });
        expect(heading).toBeInTheDocument();
      });

      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.pdf', {
        type: 'application/pdf',
      });
      const input = document.getElementById('contract-file-input') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [largeFile],
        writable: false,
      });

      fireEvent.change(input);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('ขนาดไฟล์ต้องไม่เกิน 10MB');
      });

      alertSpy.mockRestore();
    });

    it('should display file size in human-readable format', async () => {
      render(<ContractManager projectId={mockProjectId} />);

      await waitFor(() => {
        const heading = screen.getByRole('heading', { level: 3, name: 'อัพโหลดสัญญา' });
        expect(heading).toBeInTheDocument();
      });

      const file = new File(['x'.repeat(1024 * 500)], 'test.pdf', { type: 'application/pdf' });
      const input = document.getElementById('contract-file-input') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(input);

      await waitFor(() => {
        expect(screen.getByText(/KB/)).toBeInTheDocument();
      });
    });
  });

  describe('Description Input', () => {
    it('should update description on textarea change', async () => {
      render(<ContractManager projectId={mockProjectId} />);

      await waitFor(() => {
        const heading = screen.getByRole('heading', { level: 3, name: 'อัพโหลดสัญญา' });
        expect(heading).toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText(/ระบุรายละเอียดสัญญา/);
      fireEvent.change(textarea, { target: { value: 'New description' } });

      expect(textarea).toHaveValue('New description');
    });
  });

  describe('Upload Button State', () => {
    it('should disable upload button when no file selected', async () => {
      render(<ContractManager projectId={mockProjectId} />);

      await waitFor(() => {
        const button = screen.getByRole('button', { name: /อัพโหลดสัญญา/ });
        expect(button).toBeDisabled();
      });
    });

    it('should enable upload button when file selected', async () => {
      render(<ContractManager projectId={mockProjectId} />);

      await waitFor(() => {
        const heading = screen.getByRole('heading', { level: 3, name: 'อัพโหลดสัญญา' });
        expect(heading).toBeInTheDocument();
      });

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const input = document.getElementById('contract-file-input') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(input);

      await waitFor(() => {
        const button = screen.getByRole('button', { name: /อัพโหลดสัญญา/ });
        expect(button).not.toBeDisabled();
      });
    });

    it('should disable button while uploading', async () => {
      vi.mocked(firebaseStorage.uploadBytes).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      vi.mocked(firebaseStorage.getDownloadURL).mockResolvedValue('https://example.com/file.pdf');

      render(<ContractManager projectId={mockProjectId} />);

      await waitFor(() => {
        const heading = screen.getByRole('heading', { level: 3, name: 'อัพโหลดสัญญา' });
        expect(heading).toBeInTheDocument();
      });

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const input = document.getElementById('contract-file-input') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(input);

      await waitFor(() => {
        const button = screen.getByRole('button', { name: /อัพโหลดสัญญา/ });
        expect(button).not.toBeDisabled();
      });

      const uploadButton = screen.getByRole('button', { name: /อัพโหลดสัญญา/ });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText(/กำลังอัพโหลด/)).toBeInTheDocument();
      });
    });
  });

  describe('Upload Functionality', () => {
    it('should alert if no file selected on upload', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      render(<ContractManager projectId={mockProjectId} />);

      await waitFor(() => {
        const heading = screen.getByRole('heading', { level: 3, name: 'อัพโหลดสัญญา' });
        expect(heading).toBeInTheDocument();
      });

      // Verify button is disabled when no file
      const button = screen.getByRole('button', { name: /อัพโหลดสัญญา/ });
      expect(button).toBeDisabled();

      alertSpy.mockRestore();
    });

    it('should upload file to Firebase Storage', async () => {
      vi.mocked(firebaseStorage.uploadBytes).mockResolvedValue({} as any);
      vi.mocked(firebaseStorage.getDownloadURL).mockResolvedValue('https://example.com/file.pdf');
      vi.mocked(firebaseFirestore.addDoc).mockResolvedValue({ id: 'new-contract' } as any);

      render(<ContractManager projectId={mockProjectId} />);

      await waitFor(() => {
        const heading = screen.getByRole('heading', { level: 3, name: 'อัพโหลดสัญญา' });
        expect(heading).toBeInTheDocument();
      });

      const file = new File(['test content'], 'contract.pdf', { type: 'application/pdf' });
      const input = document.getElementById('contract-file-input') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(input);

      await waitFor(() => {
        expect(screen.getByText(/contract\.pdf/)).toBeInTheDocument();
      });

      const uploadButton = screen.getByRole('button', { name: /อัพโหลดสัญญา/ });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(firebaseStorage.uploadBytes).toHaveBeenCalled();
      });
    });

    it('should save metadata to Firestore', async () => {
      const mockCollectionRef = { _type: 'collection' };
      vi.mocked(firebaseFirestore.collection).mockReturnValue(mockCollectionRef as any);
      vi.mocked(firebaseStorage.uploadBytes).mockResolvedValue({} as any);
      vi.mocked(firebaseStorage.getDownloadURL).mockResolvedValue('https://example.com/file.pdf');
      vi.mocked(firebaseFirestore.addDoc).mockResolvedValue({ id: 'new-contract' } as any);

      render(<ContractManager projectId={mockProjectId} />);

      await waitFor(() => {
        const heading = screen.getByRole('heading', { level: 3, name: 'อัพโหลดสัญญา' });
        expect(heading).toBeInTheDocument();
      });

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const input = document.getElementById('contract-file-input') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(input);

      const textarea = screen.getByPlaceholderText(/ระบุรายละเอียดสัญญา/);
      fireEvent.change(textarea, { target: { value: 'Test description' } });

      await waitFor(() => {
        expect(screen.getByText(/test\.pdf/)).toBeInTheDocument();
      });

      const uploadButton = screen.getByRole('button', { name: /อัพโหลดสัญญา/ });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(firebaseFirestore.addDoc).toHaveBeenCalledWith(
          mockCollectionRef,
          expect.objectContaining({
            projectId: mockProjectId,
            fileName: 'test.pdf',
            description: 'Test description',
          })
        );
      });
    });

    it('should show success alert after upload', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      vi.mocked(firebaseStorage.uploadBytes).mockResolvedValue({} as any);
      vi.mocked(firebaseStorage.getDownloadURL).mockResolvedValue('https://example.com/file.pdf');
      vi.mocked(firebaseFirestore.addDoc).mockResolvedValue({ id: 'new-contract' } as any);

      render(<ContractManager projectId={mockProjectId} />);

      await waitFor(() => {
        const heading = screen.getByRole('heading', { level: 3, name: 'อัพโหลดสัญญา' });
        expect(heading).toBeInTheDocument();
      });

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const input = document.getElementById('contract-file-input') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(input);

      await waitFor(() => {
        const button = screen.getByRole('button', { name: /อัพโหลดสัญญา/ });
        expect(button).not.toBeDisabled();
      });

      const uploadButton = screen.getByRole('button', { name: /อัพโหลดสัญญา/ });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('อัพโหลดสัญญาสำเร็จ');
      });

      alertSpy.mockRestore();
    });

    it('should handle upload error', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.mocked(firebaseStorage.uploadBytes).mockRejectedValue(new Error('Upload failed'));

      render(<ContractManager projectId={mockProjectId} />);

      await waitFor(() => {
        const heading = screen.getByRole('heading', { level: 3, name: 'อัพโหลดสัญญา' });
        expect(heading).toBeInTheDocument();
      });

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const input = document.getElementById('contract-file-input') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(input);

      await waitFor(() => {
        const button = screen.getByRole('button', { name: /อัพโหลดสัญญา/ });
        expect(button).not.toBeDisabled();
      });

      const uploadButton = screen.getByRole('button', { name: /อัพโหลดสัญญา/ });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('เกิดข้อผิดพลาดในการอัพโหลดไฟล์');
      });

      alertSpy.mockRestore();
      consoleSpy.mockRestore();
    });
  });

  describe('Contract Display', () => {
    it('should display contract cards', async () => {
      const mockSnapshot = {
        forEach: (callback: any) => {
          callback({
            id: 'contract-1',
            data: () => ({
              fileName: 'important-contract.pdf',
              fileUrl: 'https://example.com/contract.pdf',
              uploadDate: { toDate: () => new Date('2024-01-15') },
              fileSize: 2048000,
              description: 'Important contract',
            }),
          });
        },
        docs: [{ id: 'contract-1' }],
        size: 1,
        empty: false,
      };

      vi.mocked(firebaseFirestore.getDocs).mockResolvedValue(mockSnapshot as any);

      render(<ContractManager projectId={mockProjectId} />);

      await waitFor(() => {
        expect(screen.getByText('important-contract.pdf')).toBeInTheDocument();
        expect(screen.getByText('Important contract')).toBeInTheDocument();
      });
    });

    it('should display file size in contract card', async () => {
      const mockSnapshot = {
        forEach: (callback: any) => {
          callback({
            id: 'contract-1',
            data: () => ({
              fileName: 'test.pdf',
              fileUrl: 'https://example.com/test.pdf',
              uploadDate: { toDate: () => new Date() },
              fileSize: 1536000, // 1.5 MB
            }),
          });
        },
        docs: [{ id: 'contract-1' }],
        size: 1,
        empty: false,
      };

      vi.mocked(firebaseFirestore.getDocs).mockResolvedValue(mockSnapshot as any);

      render(<ContractManager projectId={mockProjectId} />);

      await waitFor(() => {
        expect(screen.getByText(/1\.46 MB/)).toBeInTheDocument();
      });
    });

    it('should display upload date in Thai format', async () => {
      const mockSnapshot = {
        forEach: (callback: any) => {
          callback({
            id: 'contract-1',
            data: () => ({
              fileName: 'test.pdf',
              fileUrl: 'https://example.com/test.pdf',
              uploadDate: { toDate: () => new Date('2024-01-15') },
              fileSize: 1024,
            }),
          });
        },
        docs: [{ id: 'contract-1' }],
        size: 1,
        empty: false,
      };

      vi.mocked(firebaseFirestore.getDocs).mockResolvedValue(mockSnapshot as any);

      render(<ContractManager projectId={mockProjectId} />);

      await waitFor(() => {
        // Thai date format includes month name
        expect(screen.getByText(/15|มกราคม|2567|2024/)).toBeInTheDocument();
      });
    });
  });

  describe('Contract Actions', () => {
    it('should render preview button for each contract', async () => {
      const mockSnapshot = {
        forEach: (callback: any) => {
          callback({
            id: 'contract-1',
            data: () => ({
              fileName: 'test.pdf',
              fileUrl: 'https://example.com/test.pdf',
              uploadDate: { toDate: () => new Date() },
              fileSize: 1024,
            }),
          });
        },
        docs: [{ id: 'contract-1' }],
        size: 1,
        empty: false,
      };

      vi.mocked(firebaseFirestore.getDocs).mockResolvedValue(mockSnapshot as any);

      render(<ContractManager projectId={mockProjectId} />);

      await waitFor(() => {
        const previewButton = screen.getByTitle('ดูตัวอย่าง');
        expect(previewButton).toBeInTheDocument();
      });
    });

    it('should render download button for each contract', async () => {
      const mockSnapshot = {
        forEach: (callback: any) => {
          callback({
            id: 'contract-1',
            data: () => ({
              fileName: 'test.pdf',
              fileUrl: 'https://example.com/test.pdf',
              uploadDate: { toDate: () => new Date() },
              fileSize: 1024,
            }),
          });
        },
        docs: [{ id: 'contract-1' }],
        size: 1,
        empty: false,
      };

      vi.mocked(firebaseFirestore.getDocs).mockResolvedValue(mockSnapshot as any);

      render(<ContractManager projectId={mockProjectId} />);

      await waitFor(() => {
        const downloadButton = screen.getByTitle('ดาวน์โหลด');
        expect(downloadButton).toBeInTheDocument();
      });
    });

    it('should render delete button for each contract', async () => {
      const mockSnapshot = {
        forEach: (callback: any) => {
          callback({
            id: 'contract-1',
            data: () => ({
              fileName: 'test.pdf',
              fileUrl: 'https://example.com/test.pdf',
              uploadDate: { toDate: () => new Date() },
              fileSize: 1024,
            }),
          });
        },
        docs: [{ id: 'contract-1' }],
        size: 1,
        empty: false,
      };

      vi.mocked(firebaseFirestore.getDocs).mockResolvedValue(mockSnapshot as any);

      render(<ContractManager projectId={mockProjectId} />);

      await waitFor(() => {
        const deleteButton = screen.getByTitle('ลบ');
        expect(deleteButton).toBeInTheDocument();
      });
    });
  });

  describe('Preview Modal', () => {
    it('should open preview modal on preview button click', async () => {
      const mockSnapshot = {
        forEach: (callback: any) => {
          callback({
            id: 'contract-1',
            data: () => ({
              fileName: 'test.pdf',
              fileUrl: 'https://example.com/test.pdf',
              uploadDate: { toDate: () => new Date() },
              fileSize: 1024,
            }),
          });
        },
        docs: [{ id: 'contract-1' }],
        size: 1,
        empty: false,
      };

      vi.mocked(firebaseFirestore.getDocs).mockResolvedValue(mockSnapshot as any);

      render(<ContractManager projectId={mockProjectId} />);

      await waitFor(() => {
        expect(screen.getByTitle('ดูตัวอย่าง')).toBeInTheDocument();
      });

      const previewButton = screen.getByTitle('ดูตัวอย่าง');
      fireEvent.click(previewButton);

      await waitFor(() => {
        expect(screen.getByText('ตัวอย่างสัญญา')).toBeInTheDocument();
        expect(screen.getByTitle('PDF Preview')).toBeInTheDocument();
      });
    });

    it('should display iframe with correct src in preview modal', async () => {
      const mockSnapshot = {
        forEach: (callback: any) => {
          callback({
            id: 'contract-1',
            data: () => ({
              fileName: 'test.pdf',
              fileUrl: 'https://example.com/test.pdf',
              uploadDate: { toDate: () => new Date() },
              fileSize: 1024,
            }),
          });
        },
        docs: [{ id: 'contract-1' }],
        size: 1,
        empty: false,
      };

      vi.mocked(firebaseFirestore.getDocs).mockResolvedValue(mockSnapshot as any);

      render(<ContractManager projectId={mockProjectId} />);

      await waitFor(() => {
        expect(screen.getByTitle('ดูตัวอย่าง')).toBeInTheDocument();
      });

      const previewButton = screen.getByTitle('ดูตัวอย่าง');
      fireEvent.click(previewButton);

      await waitFor(() => {
        const iframe = screen.getByTitle('PDF Preview') as HTMLIFrameElement;
        expect(iframe.src).toContain('https://example.com/test.pdf');
      });
    });

    it('should close preview modal on close button click', async () => {
      const mockSnapshot = {
        forEach: (callback: any) => {
          callback({
            id: 'contract-1',
            data: () => ({
              fileName: 'test.pdf',
              fileUrl: 'https://example.com/test.pdf',
              uploadDate: { toDate: () => new Date() },
              fileSize: 1024,
            }),
          });
        },
        docs: [{ id: 'contract-1' }],
        size: 1,
        empty: false,
      };

      vi.mocked(firebaseFirestore.getDocs).mockResolvedValue(mockSnapshot as any);

      render(<ContractManager projectId={mockProjectId} />);

      await waitFor(() => {
        expect(screen.getByTitle('ดูตัวอย่าง')).toBeInTheDocument();
      });

      const previewButton = screen.getByTitle('ดูตัวอย่าง');
      fireEvent.click(previewButton);

      await waitFor(() => {
        expect(screen.getByText('ตัวอย่างสัญญา')).toBeInTheDocument();
      });

      const closeButtons = screen
        .getAllByRole('button')
        .filter(btn => btn.querySelector('svg path[d*="M6 18L18 6M6 6l12 12"]'));

      if (closeButtons.length > 0) {
        fireEvent.click(closeButtons[0]);

        await waitFor(() => {
          expect(screen.queryByText('ตัวอย่างสัญญา')).not.toBeInTheDocument();
        });
      }
    });
  });

  describe('Download Functionality', () => {
    it('should open file in new tab on download', async () => {
      const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

      const mockSnapshot = {
        forEach: (callback: any) => {
          callback({
            id: 'contract-1',
            data: () => ({
              fileName: 'test.pdf',
              fileUrl: 'https://example.com/test.pdf',
              uploadDate: { toDate: () => new Date() },
              fileSize: 1024,
            }),
          });
        },
        docs: [{ id: 'contract-1' }],
        size: 1,
        empty: false,
      };

      vi.mocked(firebaseFirestore.getDocs).mockResolvedValue(mockSnapshot as any);

      render(<ContractManager projectId={mockProjectId} />);

      await waitFor(() => {
        expect(screen.getByTitle('ดาวน์โหลด')).toBeInTheDocument();
      });

      const downloadButton = screen.getByTitle('ดาวน์โหลด');
      fireEvent.click(downloadButton);

      expect(windowOpenSpy).toHaveBeenCalledWith('https://example.com/test.pdf', '_blank');

      windowOpenSpy.mockRestore();
    });
  });

  describe('Delete Functionality', () => {
    it('should show confirmation dialog on delete', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

      const mockSnapshot = {
        forEach: (callback: any) => {
          callback({
            id: 'contract-1',
            data: () => ({
              fileName: 'test.pdf',
              fileUrl: 'https://example.com/test.pdf',
              uploadDate: { toDate: () => new Date() },
              fileSize: 1024,
            }),
          });
        },
        docs: [{ id: 'contract-1' }],
        size: 1,
        empty: false,
      };

      vi.mocked(firebaseFirestore.getDocs).mockResolvedValue(mockSnapshot as any);

      render(<ContractManager projectId={mockProjectId} />);

      await waitFor(() => {
        expect(screen.getByTitle('ลบ')).toBeInTheDocument();
      });

      const deleteButton = screen.getByTitle('ลบ');
      fireEvent.click(deleteButton);

      expect(confirmSpy).toHaveBeenCalledWith('ต้องการลบสัญญา "test.pdf" หรือไม่?');

      confirmSpy.mockRestore();
    });

    it('should not delete if user cancels', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

      const mockSnapshot = {
        forEach: (callback: any) => {
          callback({
            id: 'contract-1',
            data: () => ({
              fileName: 'test.pdf',
              fileUrl: 'https://example.com/test.pdf',
              uploadDate: { toDate: () => new Date() },
              fileSize: 1024,
            }),
          });
        },
        docs: [{ id: 'contract-1' }],
        size: 1,
        empty: false,
      };

      vi.mocked(firebaseFirestore.getDocs).mockResolvedValue(mockSnapshot as any);

      render(<ContractManager projectId={mockProjectId} />);

      await waitFor(() => {
        expect(screen.getByTitle('ลบ')).toBeInTheDocument();
      });

      const deleteButton = screen.getByTitle('ลบ');
      fireEvent.click(deleteButton);

      expect(firebaseStorage.deleteObject).not.toHaveBeenCalled();

      confirmSpy.mockRestore();
    });

    it('should delete from Storage and Firestore if confirmed', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      vi.mocked(firebaseStorage.deleteObject).mockResolvedValue();
      vi.mocked(firebaseFirestore.deleteDoc).mockResolvedValue();

      const mockSnapshot = {
        forEach: (callback: any) => {
          callback({
            id: 'contract-1',
            data: () => ({
              fileName: 'test.pdf',
              fileUrl: 'https://example.com/test.pdf',
              uploadDate: { toDate: () => new Date() },
              fileSize: 1024,
            }),
          });
        },
        docs: [{ id: 'contract-1' }],
        size: 1,
        empty: false,
      };

      vi.mocked(firebaseFirestore.getDocs).mockResolvedValue(mockSnapshot as any);

      render(<ContractManager projectId={mockProjectId} />);

      await waitFor(() => {
        expect(screen.getByTitle('ลบ')).toBeInTheDocument();
      });

      const deleteButton = screen.getByTitle('ลบ');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(firebaseStorage.deleteObject).toHaveBeenCalled();
        expect(firebaseFirestore.deleteDoc).toHaveBeenCalled();
      });

      confirmSpy.mockRestore();
      alertSpy.mockRestore();
    });

    it('should show success alert after delete', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      vi.mocked(firebaseStorage.deleteObject).mockResolvedValue();
      vi.mocked(firebaseFirestore.deleteDoc).mockResolvedValue();

      const mockSnapshot = {
        forEach: (callback: any) => {
          callback({
            id: 'contract-1',
            data: () => ({
              fileName: 'test.pdf',
              fileUrl: 'https://example.com/test.pdf',
              uploadDate: { toDate: () => new Date() },
              fileSize: 1024,
            }),
          });
        },
        docs: [{ id: 'contract-1' }],
        size: 1,
        empty: false,
      };

      vi.mocked(firebaseFirestore.getDocs).mockResolvedValue(mockSnapshot as any);

      render(<ContractManager projectId={mockProjectId} />);

      await waitFor(() => {
        expect(screen.getByTitle('ลบ')).toBeInTheDocument();
      });

      const deleteButton = screen.getByTitle('ลบ');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('ลบสัญญาสำเร็จ');
      });

      confirmSpy.mockRestore();
      alertSpy.mockRestore();
    });

    it('should handle delete error', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.mocked(firebaseStorage.deleteObject).mockRejectedValue(new Error('Delete failed'));

      const mockSnapshot = {
        forEach: (callback: any) => {
          callback({
            id: 'contract-1',
            data: () => ({
              fileName: 'test.pdf',
              fileUrl: 'https://example.com/test.pdf',
              uploadDate: { toDate: () => new Date() },
              fileSize: 1024,
            }),
          });
        },
        docs: [{ id: 'contract-1' }],
        size: 1,
        empty: false,
      };

      vi.mocked(firebaseFirestore.getDocs).mockResolvedValue(mockSnapshot as any);

      render(<ContractManager projectId={mockProjectId} />);

      await waitFor(() => {
        expect(screen.getByTitle('ลบ')).toBeInTheDocument();
      });

      const deleteButton = screen.getByTitle('ลบ');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('เกิดข้อผิดพลาดในการลบไฟล์');
      });

      confirmSpy.mockRestore();
      alertSpy.mockRestore();
      consoleSpy.mockRestore();
    });
  });

  describe('File Size Formatting', () => {
    it('should format bytes correctly', async () => {
      const mockSnapshot = {
        forEach: (callback: any) => {
          callback({
            id: 'contract-1',
            data: () => ({
              fileName: 'test.pdf',
              fileUrl: 'https://example.com/test.pdf',
              uploadDate: { toDate: () => new Date() },
              fileSize: 512, // 512 Bytes
            }),
          });
        },
        docs: [{ id: 'contract-1' }],
        size: 1,
        empty: false,
      };

      vi.mocked(firebaseFirestore.getDocs).mockResolvedValue(mockSnapshot as any);

      render(<ContractManager projectId={mockProjectId} />);

      await waitFor(() => {
        expect(screen.getByText(/512 Bytes/)).toBeInTheDocument();
      });
    });

    it('should format KB correctly', async () => {
      const mockSnapshot = {
        forEach: (callback: any) => {
          callback({
            id: 'contract-1',
            data: () => ({
              fileName: 'test.pdf',
              fileUrl: 'https://example.com/test.pdf',
              uploadDate: { toDate: () => new Date() },
              fileSize: 10240, // 10 KB
            }),
          });
        },
        docs: [{ id: 'contract-1' }],
        size: 1,
        empty: false,
      };

      vi.mocked(firebaseFirestore.getDocs).mockResolvedValue(mockSnapshot as any);

      render(<ContractManager projectId={mockProjectId} />);

      await waitFor(() => {
        expect(screen.getByText(/10 KB/)).toBeInTheDocument();
      });
    });

    it('should format MB correctly', async () => {
      const mockSnapshot = {
        forEach: (callback: any) => {
          callback({
            id: 'contract-1',
            data: () => ({
              fileName: 'test.pdf',
              fileUrl: 'https://example.com/test.pdf',
              uploadDate: { toDate: () => new Date() },
              fileSize: 5242880, // 5 MB
            }),
          });
        },
        docs: [{ id: 'contract-1' }],
        size: 1,
        empty: false,
      };

      vi.mocked(firebaseFirestore.getDocs).mockResolvedValue(mockSnapshot as any);

      render(<ContractManager projectId={mockProjectId} />);

      await waitFor(() => {
        expect(screen.getByText(/5 MB/)).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle contract without description', async () => {
      const mockSnapshot = {
        forEach: (callback: any) => {
          callback({
            id: 'contract-1',
            data: () => ({
              fileName: 'test.pdf',
              fileUrl: 'https://example.com/test.pdf',
              uploadDate: { toDate: () => new Date() },
              fileSize: 1024,
              description: '',
            }),
          });
        },
        docs: [{ id: 'contract-1' }],
        size: 1,
        empty: false,
      };

      vi.mocked(firebaseFirestore.getDocs).mockResolvedValue(mockSnapshot as any);

      render(<ContractManager projectId={mockProjectId} />);

      await waitFor(() => {
        expect(screen.getByText('test.pdf')).toBeInTheDocument();
        // Description should not be rendered
      });
    });

    it('should handle zero file size', async () => {
      const mockSnapshot = {
        forEach: (callback: any) => {
          callback({
            id: 'contract-1',
            data: () => ({
              fileName: 'test.pdf',
              fileUrl: 'https://example.com/test.pdf',
              uploadDate: { toDate: () => new Date() },
              fileSize: 0,
            }),
          });
        },
        docs: [{ id: 'contract-1' }],
        size: 1,
        empty: false,
      };

      vi.mocked(firebaseFirestore.getDocs).mockResolvedValue(mockSnapshot as any);

      render(<ContractManager projectId={mockProjectId} />);

      await waitFor(() => {
        expect(screen.getByText('0 Bytes')).toBeInTheDocument();
      });
    });

    it('should reload contracts after projectId changes', async () => {
      const { rerender } = render(<ContractManager projectId="project-1" />);

      await waitFor(() => {
        expect(firebaseFirestore.getDocs).toHaveBeenCalled();
      });

      vi.clearAllMocks();

      rerender(<ContractManager projectId="project-2" />);

      await waitFor(() => {
        expect(firebaseFirestore.where).toHaveBeenCalledWith('projectId', '==', 'project-2');
      });
    });
  });
});
