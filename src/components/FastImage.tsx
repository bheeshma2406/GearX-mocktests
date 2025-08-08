'use client';

import { useState, useEffect } from 'react';

interface FastImageProps {
  src: string;
  alt: string;
  className?: string;
  id?: string;
  onError?: () => void;
}

export default function FastImage({
  src,
  alt,
  className = '',
  id,
  onError,
}: FastImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageSrc, setImageSrc] = useState(src);

  // Reset loading state when src changes (for question switching)
  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
    setImageSrc(src);
  }, [src]);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
    onError?.();
    console.error('Failed to load image:', src);
  };

  if (hasError) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 border border-gray-200 rounded min-h-[300px] ${className}`}
      >
        <div className="text-center text-gray-500">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="mt-2 text-sm">Failed to load image</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 rounded animate-pulse flex items-center justify-center min-h-[300px] z-10">
          <div className="text-gray-400">
            <svg className="animate-spin h-8 w-8" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        </div>
      )}
      <img
        id={id}
        src={imageSrc}
        alt={alt}
        className={`transition-opacity duration-200 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        } ${className}`}
        onLoad={handleLoad}
        onError={handleError}
        style={{
          // Performance optimizations
          imageRendering: 'auto',
          transform: 'translateZ(0)', // Hardware acceleration
          willChange: 'opacity', // Hint for browser optimization
        }}
        // Preload optimization
        loading="eager" // Load immediately for better question switching
        decoding="async" // Don't block rendering
      />
    </div>
  );
}
