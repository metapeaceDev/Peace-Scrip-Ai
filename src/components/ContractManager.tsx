import React, { useState, useEffect } from 'react';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  Timestamp,
} from 'firebase/firestore';
import { storage, db } from '../config/firebase';

interface ContractManagerProps {
  projectId: string;
}

interface Contract {
  id: string;
  fileName: string;
  fileUrl: string;
  uploadDate: Date;
  fileSize: number;
  description: string;
}

export const ContractManager: React.FC<ContractManagerProps> = ({ projectId }) => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    loadContracts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const loadContracts = async () => {
    try {
      setLoading(true);
      const contractsRef = collection(db, 'contracts');
      const q = query(contractsRef, where('projectId', '==', projectId));
      const snapshot = await getDocs(q);

      const loadedContracts: Contract[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        loadedContracts.push({
          id: doc.id,
          ...data,
          uploadDate: data.uploadDate?.toDate?.() || new Date(),
        } as Contract);
      });

      setContracts(loadedContracts);
    } catch (error) {
      console.error('Error loading contracts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        alert('กรุณาเลือกไฟล์ PDF เท่านั้น');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        // 10MB limit
        alert('ขนาดไฟล์ต้องไม่เกิน 10MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('กรุณาเลือกไฟล์');
      return;
    }

    try {
      setUploading(true);

      // Upload to Firebase Storage
      const timestamp = Date.now();
      const fileName = `${timestamp}_${selectedFile.name}`;
      const storageRef = ref(storage, `contracts/${projectId}/${fileName}`);

      await uploadBytes(storageRef, selectedFile);
      const downloadURL = await getDownloadURL(storageRef);

      // Save metadata to Firestore
      const contractsRef = collection(db, 'contracts');
      await addDoc(contractsRef, {
        projectId,
        fileName: selectedFile.name,
        storagePath: `contracts/${projectId}/${fileName}`,
        fileUrl: downloadURL,
        fileSize: selectedFile.size,
        description: description.trim(),
        uploadDate: Timestamp.now(),
        createdAt: Timestamp.now(),
      });

      // Reset form
      setSelectedFile(null);
      setDescription('');
      const fileInput = document.getElementById('contract-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      // Reload contracts
      await loadContracts();
      alert('อัพโหลดสัญญาสำเร็จ');
    } catch (error) {
      console.error('Error uploading contract:', error);
      alert('เกิดข้อผิดพลาดในการอัพโหลดไฟล์');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (contract: Contract) => {
    if (!confirm(`ต้องการลบสัญญา "${contract.fileName}" หรือไม่?`)) {
      return;
    }

    try {
      // Delete from Storage
      const storageRef = ref(storage, `contracts/${projectId}/${contract.fileName}`);
      await deleteObject(storageRef);

      // Delete from Firestore
      await deleteDoc(doc(db, 'contracts', contract.id));

      // Reload contracts
      await loadContracts();
      alert('ลบสัญญาสำเร็จ');
    } catch (error) {
      console.error('Error deleting contract:', error);
      alert('เกิดข้อผิดพลาดในการลบไฟล์');
    }
  };

  const handlePreview = (contract: Contract) => {
    setPreviewUrl(contract.fileUrl);
  };

  const handleDownload = (contract: Contract) => {
    window.open(contract.fileUrl, '_blank');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">อัพโหลดสัญญา</h3>

        <div className="space-y-4">
          {/* File Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">เลือกไฟล์ PDF</label>
            <input
              id="contract-file-input"
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
            />
            {selectedFile && (
              <p className="mt-2 text-sm text-gray-600">
                ไฟล์ที่เลือก: {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              คำอธิบาย (ไม่บังคับ)
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
              placeholder="ระบุรายละเอียดสัญญา เช่น สัญญาจ้างงานโปรดักชัน..."
            />
          </div>

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
          >
            {uploading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                กำลังอัพโหลด...
              </span>
            ) : (
              'อัพโหลดสัญญา'
            )}
          </button>
        </div>
      </div>

      {/* Contracts List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">สัญญาทั้งหมด ({contracts.length})</h3>
        </div>

        <div className="p-6">
          {contracts.length === 0 ? (
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
              <p>ยังไม่มีสัญญา</p>
              <p className="text-sm mt-1">อัพโหลดสัญญาเพื่อเริ่มจัดการ</p>
            </div>
          ) : (
            <div className="space-y-4">
              {contracts.map(contract => (
                <div
                  key={contract.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-red-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 truncate">
                          {contract.fileName}
                        </h4>
                        {contract.description && (
                          <p className="text-sm text-gray-600 mt-1">{contract.description}</p>
                        )}
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                          <span>{formatFileSize(contract.fileSize)}</span>
                          <span>•</span>
                          <span>
                            {new Date(contract.uploadDate).toLocaleDateString('th-TH', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handlePreview(contract)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="ดูตัวอย่าง"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDownload(contract)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="ดาวน์โหลด"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(contract)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="ลบ"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* PDF Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-6xl h-5/6 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">ตัวอย่างสัญญา</h3>
              <button
                onClick={() => setPreviewUrl(null)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
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
            <div className="flex-1 p-4 overflow-hidden">
              <iframe
                src={`${previewUrl}#toolbar=0`}
                className="w-full h-full rounded border border-gray-300"
                title="PDF Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

