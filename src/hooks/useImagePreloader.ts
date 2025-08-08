'use client';

import { useEffect } from 'react';

interface Question {
  id: string;
  imagePath: string;
  // ... other question properties
}

export const useImagePreloader = (
  questions: Question[],
  currentIndex: number,
  preloadCount: number = 3
) => {
  useEffect(() => {
    // Preload next few images for smooth switching
    const imagesToPreload: string[] = [];
    
    // Get next few questions
    for (let i = 1; i <= preloadCount; i++) {
      const nextIndex = currentIndex + i;
      if (nextIndex < questions.length && questions[nextIndex]?.imagePath) {
        imagesToPreload.push(questions[nextIndex].imagePath);
      }
    }
    
    // Get previous few questions (in case user goes back)
    for (let i = 1; i <= Math.min(preloadCount, 2); i++) {
      const prevIndex = currentIndex - i;
      if (prevIndex >= 0 && questions[prevIndex]?.imagePath) {
        imagesToPreload.push(questions[prevIndex].imagePath);
      }
    }
    
    // Preload images
    imagesToPreload.forEach(imagePath => {
      const img = new Image();
      img.src = imagePath;
      // Optional: Add to cache or handle load/error events
      img.onload = () => {
        // Image preloaded successfully
      };
      img.onerror = () => {
        console.warn('Failed to preload image:', imagePath);
      };
    });
    
  }, [questions, currentIndex, preloadCount]);
};
