import React from 'react';

interface SkeletonLoaderProps {
  type?: 'text' | 'card' | 'question' | 'table-row';
  count?: number;
  className?: string;
}

export default function SkeletonLoader({ type = 'text', count = 1, className = '' }: SkeletonLoaderProps) {
  const renderSkeleton = () => {
    switch (type) {
      case 'text':
        return (
          <div className={`animate-pulse ${className}`}>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
          </div>
        );
      
      case 'card':
        return (
          <div className={`animate-pulse bg-white rounded-lg shadow-sm p-6 ${className}`}>
            <div className="flex items-center space-x-4 mb-4">
              <div className="h-12 w-12 bg-gray-200 rounded-lg"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
            <div className="space-y-2 mb-4">
              <div className="h-3 bg-gray-200 rounded"></div>
              <div className="h-3 bg-gray-200 rounded w-5/6"></div>
              <div className="h-3 bg-gray-200 rounded w-4/6"></div>
            </div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        );
      
      case 'question':
        return (
          <div className={`animate-pulse ${className}`}>
            <div className="bg-gray-100 rounded-lg p-4 mb-4">
              <div className="h-64 bg-gray-200 rounded mb-4"></div>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <div className="h-4 w-4 bg-gray-200 rounded-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="h-4 w-4 bg-gray-200 rounded-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="h-4 w-4 bg-gray-200 rounded-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="h-4 w-4 bg-gray-200 rounded-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'table-row':
        return (
          <tr className={`animate-pulse ${className}`}>
            <td className="px-6 py-4">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
            </td>
            <td className="px-6 py-4">
              <div className="h-4 bg-gray-200 rounded w-32"></div>
            </td>
            <td className="px-6 py-4">
              <div className="h-4 bg-gray-200 rounded w-20"></div>
            </td>
            <td className="px-6 py-4">
              <div className="h-4 bg-gray-200 rounded w-16"></div>
            </td>
          </tr>
        );
      
      default:
        return null;
    }
  };

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} role="status" aria-label="Loading content">
          {renderSkeleton()}
        </div>
      ))}
    </>
  );
}
