import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';

interface MobileAppWrapperProps {
  children: React.ReactNode;
}

/**
 * Wrapper component that handles mobile-specific behaviors
 * Add this to wrap your entire app for better mobile experience
 */
export const MobileAppWrapper = ({ children }: MobileAppWrapperProps) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detect if running in Capacitor
    setIsMobile(Capacitor.isNativePlatform());

    // Fix viewport height on mobile (especially iOS)
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    setVH();
    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', setVH);

    // Prevent pull-to-refresh on mobile
    if (isMobile) {
      document.body.style.overscrollBehavior = 'none';
    }

    return () => {
      window.removeEventListener('resize', setVH);
      window.removeEventListener('orientationchange', setVH);
    };
  }, [isMobile]);

  return (
    <div 
      className="mobile-app-wrapper"
      style={{
        minHeight: isMobile ? 'calc(var(--vh, 1vh) * 100)' : '100vh',
        width: '100%',
        overflow: 'hidden'
      }}
    >
      {children}
    </div>
  );
};