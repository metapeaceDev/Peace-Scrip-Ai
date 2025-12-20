/**
 * Loading Fallback Component
 *
 * Shown while lazy-loaded components are being loaded
 */

import React from 'react';

const LoadingFallback: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-400 text-lg">{message}</p>
      </div>
    </div>
  );
};

export default LoadingFallback;

