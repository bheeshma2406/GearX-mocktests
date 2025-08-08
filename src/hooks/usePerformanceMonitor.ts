import { useEffect, useRef } from 'react';

interface PerformanceMetrics {
  componentName: string;
  renderTime: number;
  mountTime: number;
  updateCount: number;
}

export function usePerformanceMonitor(componentName: string) {
  const renderStart = useRef<number>(performance.now());
  const mountTime = useRef<number>(0);
  const updateCount = useRef<number>(0);

  useEffect(() => {
    // Component mounted
    mountTime.current = performance.now() - renderStart.current;
    console.log(`[Performance] ${componentName} mounted in ${mountTime.current.toFixed(2)}ms`);

    return () => {
      // Component unmounted
      console.log(`[Performance] ${componentName} unmounted after ${updateCount.current} updates`);
    };
  }, [componentName]);

  useEffect(() => {
    // Track updates
    updateCount.current += 1;
    const renderTime = performance.now() - renderStart.current;
    
    if (updateCount.current > 1) {
      console.log(`[Performance] ${componentName} re-rendered (${updateCount.current}) in ${renderTime.toFixed(2)}ms`);
    }
    
    renderStart.current = performance.now();
  });

  return {
    logMetric: (action: string, duration: number) => {
      console.log(`[Performance] ${componentName} - ${action}: ${duration.toFixed(2)}ms`);
    }
  };
}
