'use client';

import { Bookmark, BookmarkCheck } from 'lucide-react';
import React from 'react';

type Props = {
  isBookmarked: boolean;
  onToggle: () => void;
  size?: number;
  className?: string;
  title?: string;
};

export default function BookmarkButton({ isBookmarked, onToggle, size = 18, className = '', title = 'Bookmark' }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={title}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border transition-colors ${
        isBookmarked
          ? 'bg-yellow-100 border-yellow-300 text-yellow-900 hover:bg-yellow-200'
          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
      } ${className}`}
    >
      {isBookmarked ? (
        <BookmarkCheck width={size} height={size} className="text-yellow-600" />
      ) : (
        <Bookmark width={size} height={size} className="text-gray-500" />
      )}
      <span className="text-sm font-medium">{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
    </button>
  );
}