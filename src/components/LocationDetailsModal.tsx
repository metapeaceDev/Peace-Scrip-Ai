import React, { useState } from 'react';
import type { LocationDetails } from '../types';

interface LocationDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  locationDetails: LocationDetails | null | undefined;
  locationString: string; // Original location string (e.g., "INT. OFFICE - DAY")
  onSave?: (updatedDetails: LocationDetails) => void; // Callback to save changes
  onRegenerate?: (section: string) => Promise<void>; // Callback to regenerate a section
  onRegenerateAll?: () => void; // Callback to open regenerate all modal
  isRegeneratingAll?: boolean; // Flag to show if regeneration is in progress
  regenerationProgress?: number; // Progress percentage (0-100)
  locationImageAlbum?: Array<{
    url: string;
    timestamp: number;
    locationString: string;
    id: string;
  }>;
  selectedLocationImageId?: string | null;
  onGenerateLocationImage?: () => void; // Callback to generate location image
  isGeneratingImage?: boolean; // Flag for image generation in progress
  onSelectLocationImage?: (id: string) => void; // Callback to select image from album
  onDeleteLocationImage?: (id: string) => void; // Callback to delete image from album
}

export const LocationDetailsModal: React.FC<LocationDetailsModalProps> = ({
  isOpen,
  onClose,
  locationDetails,
  locationString,
  onSave,
  onRegenerate,
  onRegenerateAll,
  isRegeneratingAll = false,
  regenerationProgress = 0,
  locationImageAlbum = [],
  selectedLocationImageId,
  onGenerateLocationImage,
  isGeneratingImage = false,
  onSelectLocationImage,
  onDeleteLocationImage,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedDetails, setEditedDetails] = useState<LocationDetails | null>(locationDetails || null);
  const [regeneratingSection, setRegeneratingSection] = useState<string | null>(null);

  // Get selected image or most recent
  const selectedImage = locationImageAlbum.find(img => img.id === selectedLocationImageId) || locationImageAlbum[0];

  // Update edited details when locationDetails prop changes
  React.useEffect(() => {
    if (locationDetails) {
      setEditedDetails(locationDetails);
    }
  }, [locationDetails]);

  if (!isOpen) return null;

  // If no details available, show message
  if (!locationDetails) {
    return (
      <div className="fixed inset-0 z-50 flex items-start pt-8 justify-center bg-black/70 backdrop-blur-sm overflow-y-auto">
        <div className="bg-gray-900 rounded-xl shadow-2xl max-w-2xl w-full mx-4 border border-gray-700">
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <h2 className="text-2xl font-bold text-cyan-400">📍 Location Details</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
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
          <div className="p-6">
            <div className="text-center py-8">
              <p className="text-gray-400 text-lg mb-4">{locationString}</p>
              <p className="text-gray-500">ยังไม่มีรายละเอียด Location</p>
              <p className="text-gray-600 text-sm mt-2">
                คลิก "Generate Location Details" เพื่อสร้างรายละเอียด
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleSave = () => {
    if (editedDetails && onSave) {
      onSave(editedDetails);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedDetails(locationDetails);
    setIsEditing(false);
  };

  const handleRegenerateSection = async (section: string) => {
    if (onRegenerate) {
      setRegeneratingSection(section);
      try {
        await onRegenerate(section);
      } finally {
        setRegeneratingSection(null);
      }
    }
  };

  const updateField = (section: keyof LocationDetails, field: string, value: string) => {
    if (!editedDetails) return;
    
    if (typeof editedDetails[section] === 'object') {
      setEditedDetails({
        ...editedDetails,
        [section]: {
          ...(editedDetails[section] as any),
          [field]: value,
        },
      });
    } else {
      setEditedDetails({
        ...editedDetails,
        [section]: value,
      });
    }
  };

  const renderEditableField = (
    label: string,
    section: keyof LocationDetails,
    field: string,
    value: string | undefined,
    isTextArea: boolean = false
  ) => {
    if (!isEditing) {
      return value ? (
        <div>
          <span className="text-gray-400 text-xs font-semibold">{label}:</span>
          <p className="text-gray-200 text-sm mt-1">{value}</p>
        </div>
      ) : null;
    }

    return (
      <div>
        <label className="text-gray-400 text-xs font-semibold block mb-1">{label}:</label>
        {isTextArea ? (
          <textarea
            value={value || ''}
            onChange={(e) => updateField(section, field, e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:ring-cyan-500 focus:border-cyan-500"
            rows={3}
          />
        ) : (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => updateField(section, field, e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:ring-cyan-500 focus:border-cyan-500"
          />
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start pt-8 justify-center bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-gray-900 rounded-xl shadow-2xl max-w-6xl w-full mx-4 mb-8 border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700 bg-gradient-to-r from-cyan-900/30 to-purple-900/30 sticky top-0 z-10">
          <div className="bg-gradient-to-r from-cyan-600 to-pink-600 px-6 py-4 shadow-lg">
            <div className="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-7 w-7"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white">Location Details</h2>
                <p className="text-cyan-100 text-sm mt-1">{locationString}</p>
              </div>
            </div>
            
            {/* Progress Bar */}
            {isRegeneratingAll && (
              <div className="mt-4 bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    กำลังสร้าง Location Details...
                  </span>
                  <span className="text-sm font-bold text-white">
                    {Math.round(regenerationProgress)}%
                  </span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-cyan-400 via-white to-pink-400 h-full transition-all duration-300"
                    style={{ width: `${regenerationProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
          
          {/* Edit Controls */}
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  แก้ไข
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                >
                  บันทึก
                </button>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                >
                  ยกเลิก
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors ml-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
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

        {/* Content - Scrollable */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          <div className="space-y-6">
            {/* Location Image Album Section */}
            {(locationImageAlbum.length > 0 || onGenerateLocationImage) && (
              <div className="bg-gradient-to-br from-indigo-900/30 to-cyan-900/30 rounded-lg p-5 border border-indigo-500/30">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-indigo-300 flex items-center gap-2">
                    <span className="text-xl">📸</span> Location Image Album
                    {locationImageAlbum.length > 0 && (
                      <span className="text-sm font-normal text-indigo-400">
                        ({locationImageAlbum.length} {locationImageAlbum.length === 1 ? 'รูป' : 'รูป'})
                      </span>
                    )}
                  </h3>
                </div>
                
                {/* Main Image Display */}
                {selectedImage ? (
                  <div className="space-y-4">
                    <div className="relative group aspect-video">
                      <img
                        src={selectedImage.url}
                        alt="Location Preview"
                        className="w-full h-full object-cover rounded-lg shadow-2xl border-2 border-indigo-500/50"
                        onError={(e) => {
                          console.error('Failed to load location image');
                          e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"%3E%3Crect fill="%23374151" width="1920" height="1080"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" fill="%239CA3AF" font-size="24"%3EImage Not Available (16:9)%3C/text%3E%3C/svg%3E';
                        }}
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                        <div className="bg-black/70 px-4 py-2 rounded-lg text-white text-sm">
                          📸 Generated from Location Details (16:9)
                        </div>
                      </div>
                    </div>
                    
                    {/* Image Info */}
                    <div className="flex items-center justify-between text-sm text-gray-400 px-2">
                      <div className="flex items-center gap-2">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{new Date(selectedImage.timestamp).toLocaleString('th-TH', { 
                          day: '2-digit', 
                          month: 'short', 
                          year: 'numeric', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-indigo-300">📐 16:9</span>
                        {onDeleteLocationImage && locationImageAlbum.length > 1 && (
                          <button
                            onClick={() => onDeleteLocationImage(selectedImage.id)}
                            className="text-red-400 hover:text-red-300 transition-colors p-1"
                            title="Delete this image"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Thumbnail Gallery */}
                    {locationImageAlbum.length > 1 && (
                      <div className="border-t border-indigo-500/20 pt-4">
                        <p className="text-sm text-indigo-300 mb-3 font-medium flex items-center gap-2">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          All Generated Images:
                        </p>
                        <div className="grid grid-cols-4 gap-3">
                          {locationImageAlbum.map((img) => (
                            <div
                              key={img.id}
                              onClick={() => onSelectLocationImage?.(img.id)}
                              className={`relative aspect-video cursor-pointer rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${
                                selectedImage.id === img.id
                                  ? 'border-indigo-400 ring-2 ring-indigo-400/50'
                                  : 'border-gray-600 hover:border-indigo-500'
                              }`}
                            >
                              <img
                                src={img.url}
                                alt={`Generated ${new Date(img.timestamp).toLocaleTimeString('th-TH')}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="225"%3E%3Crect fill="%23374151" width="400" height="225"/%3E%3C/svg%3E';
                                }}
                              />
                              {selectedImage.id === img.id && (
                                <div className="absolute inset-0 bg-indigo-500/20 flex items-center justify-center">
                                  <svg className="h-8 w-8 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : isGeneratingImage ? (
                  <div className="w-full aspect-video bg-gray-800/50 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-indigo-500/50">
                    <svg className="animate-spin h-12 w-12 text-indigo-400 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-indigo-300 font-medium">กำลังสร้างรูปภาพโลเคชั่น...</p>
                    <p className="text-gray-400 text-sm mt-2">กรุณารอสักครู่ (อาจใช้เวลา 30 วินาที - 2 นาที)</p>
                    <p className="text-gray-500 text-xs mt-1">📐 16:9 Widescreen Format</p>
                  </div>
                ) : (
                  <div className="w-full aspect-video bg-gray-800/50 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-gray-600">
                    <svg className="h-16 w-16 text-gray-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-gray-400 font-medium mb-2">ยังไม่มีรูปภาพโลเคชั่น</p>
                    <p className="text-gray-500 text-sm">คลิกปุ่ม "สร้างรูปภาพ" เพื่อสร้างภาพตัวอย่าง</p>
                  </div>
                )}
                
                {/* Action Buttons - Below Image Preview */}
                <div className="mt-4 flex gap-3 justify-center">
                  {onGenerateLocationImage && (
                    <button
                      onClick={onGenerateLocationImage}
                      disabled={isGeneratingImage}
                      className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 text-white rounded-lg font-medium transition-all transform hover:scale-105 flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      title="Generate Location Image"
                    >
                      {isGeneratingImage ? (
                        <>
                          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>กำลังสร้าง...</span>
                        </>
                      ) : (
                        <>
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>🔮 สร้างรูปภาพ</span>
                        </>
                      )}
                    </button>
                  )}
                  
                  {onRegenerateAll && (
                    <button
                      onClick={onRegenerateAll}
                      className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-medium transition-all transform hover:scale-105 flex items-center gap-2 shadow-lg"
                      title="Regenerate All Location Details"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>Regen All</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 1. Basic Information */}
            <div className="bg-gray-800/30 rounded-lg p-5 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-yellow-400 flex items-center gap-2">
                  <span className="text-xl">🏛️</span> Basic Information
                </h3>
                {onRegenerate && (
                  <button
                    onClick={() => handleRegenerateSection('basic')}
                    disabled={regeneratingSection === 'basic'}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white text-sm rounded-lg font-medium transition-colors flex items-center gap-1"
                  >
                    {regeneratingSection === 'basic' ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Regenerating...
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Regen
                      </>
                    )}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-4">
                {renderEditableField('Type', 'locationType', 'locationType', editedDetails?.locationType)}
                {renderEditableField('Location Name', 'locationName', 'locationName', editedDetails?.locationName)}
                {renderEditableField('Time of Day', 'timeOfDay', 'timeOfDay', editedDetails?.timeOfDay)}
              </div>
            </div>

            {/* 2. Environment Details */}
            {editedDetails?.environment && (
              <div className="bg-gray-800/30 rounded-lg p-5 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-green-400 flex items-center gap-2">
                    <span className="text-xl">🌿</span> Environment
                  </h3>
                  {onRegenerate && (
                    <button
                      onClick={() => handleRegenerateSection('environment')}
                      disabled={regeneratingSection === 'environment'}
                      className="px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white text-sm rounded-lg font-medium transition-colors flex items-center gap-1"
                    >
                      {regeneratingSection === 'environment' ? 'Regenerating...' : (
                        <>
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Regen
                        </>
                      )}
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {renderEditableField('Description', 'environment', 'description', editedDetails.environment.description, true)}
                  {renderEditableField('Architecture', 'environment', 'architecture', editedDetails.environment.architecture, true)}
                  {renderEditableField('Landscaping', 'environment', 'landscaping', editedDetails.environment.landscaping)}
                  <div className="grid grid-cols-2 gap-4">
                    {renderEditableField('Dimensions', 'environment', 'dimensions', editedDetails.environment.dimensions)}
                    {renderEditableField('Capacity', 'environment', 'capacity', editedDetails.environment.capacity)}
                  </div>
                </div>
              </div>
            )}

            {/* 3. Atmospheric Conditions */}
            {editedDetails?.atmosphere && (
              <div className="bg-gray-800/30 rounded-lg p-5 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-blue-400 flex items-center gap-2">
                    <span className="text-xl">🌤️</span> Atmospheric Conditions
                  </h3>
                  {onRegenerate && (
                    <button
                      onClick={() => handleRegenerateSection('atmosphere')}
                      disabled={regeneratingSection === 'atmosphere'}
                      className="px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white text-sm rounded-lg font-medium transition-colors flex items-center gap-1"
                    >
                      {regeneratingSection === 'atmosphere' ? 'Regenerating...' : (
                        <>
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Regen
                        </>
                      )}
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {renderEditableField('Weather', 'atmosphere', 'weather', editedDetails.atmosphere.weather)}
                  {renderEditableField('Temperature', 'atmosphere', 'temperature', editedDetails.atmosphere.temperature)}
                  {renderEditableField('Humidity', 'atmosphere', 'humidity', editedDetails.atmosphere.humidity)}
                  {renderEditableField('Wind Speed', 'atmosphere', 'windSpeed', editedDetails.atmosphere.windSpeed)}
                  {renderEditableField('Visibility', 'atmosphere', 'visibility', editedDetails.atmosphere.visibility)}
                </div>
              </div>
            )}

            {/* 4. Sensory Details */}
            {editedDetails?.sensory && (
              <div className="bg-gray-800/30 rounded-lg p-5 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-pink-400 flex items-center gap-2">
                    <span className="text-xl">👃</span> Sensory Details
                  </h3>
                  {onRegenerate && (
                    <button
                      onClick={() => handleRegenerateSection('sensory')}
                      disabled={regeneratingSection === 'sensory'}
                      className="px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white text-sm rounded-lg font-medium transition-colors flex items-center gap-1"
                    >
                      {regeneratingSection === 'sensory' ? 'Regenerating...' : (
                        <>
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Regen
                        </>
                      )}
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {renderEditableField('Smell', 'sensory', 'smell', editedDetails.sensory.smell, true)}
                  {renderEditableField('Sounds', 'sensory', 'sounds', editedDetails.sensory.sounds, true)}
                  {renderEditableField('Lighting', 'sensory', 'lighting', editedDetails.sensory.lighting, true)}
                  {renderEditableField('Colors', 'sensory', 'colors', editedDetails.sensory.colors)}
                </div>
              </div>
            )}

            {/* 5. Production Details */}
            {editedDetails?.production && (
              <div className="bg-gray-800/30 rounded-lg p-5 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-orange-400 flex items-center gap-2">
                    <span className="text-xl">🎬</span> Production Details
                  </h3>
                  {onRegenerate && (
                    <button
                      onClick={() => handleRegenerateSection('production')}
                      disabled={regeneratingSection === 'production'}
                      className="px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white text-sm rounded-lg font-medium transition-colors flex items-center gap-1"
                    >
                      {regeneratingSection === 'production' ? 'Regenerating...' : (
                        <>
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Regen
                        </>
                      )}
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {renderEditableField('Set Dressing', 'production', 'setDressing', editedDetails.production.setDressing, true)}
                  {renderEditableField('Props', 'production', 'props', editedDetails.production.props, true)}
                  {renderEditableField('Practical Lights', 'production', 'practicalLights', editedDetails.production.practicalLights, true)}
                  {renderEditableField('Special Requirements', 'production', 'specialRequirements', editedDetails.production.specialRequirements, true)}
                </div>
              </div>
            )}

            {/* 6. References */}
            {editedDetails?.references && (
              <div className="bg-gray-800/30 rounded-lg p-5 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-purple-400 flex items-center gap-2">
                    <span className="text-xl">📚</span> References
                  </h3>
                  {onRegenerate && (
                    <button
                      onClick={() => handleRegenerateSection('references')}
                      disabled={regeneratingSection === 'references'}
                      className="px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white text-sm rounded-lg font-medium transition-colors flex items-center gap-1"
                    >
                      {regeneratingSection === 'references' ? 'Regenerating...' : (
                        <>
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Regen
                        </>
                      )}
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {renderEditableField('Real-World Location', 'references', 'realWorldLocation', editedDetails.references.realWorldLocation, true)}
                  {renderEditableField('Cultural Context', 'references', 'culturalContext', editedDetails.references.culturalContext, true)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
