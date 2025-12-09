/**
 * Loading Spinner Component
 * Simple animated loading indicator
 */

import React from 'react';

const LoadingSpinner: React.FC = () => (
  <div role="status" className="flex items-center justify-center space-x-2 h-full">
    <span className="sr-only">Loading...</span>
    <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse [animation-delay:-0.3s]"></div>
    <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse [animation-delay:-0.15s]"></div>
    <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
  </div>
);

export default LoadingSpinner;
