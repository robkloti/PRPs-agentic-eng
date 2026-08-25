'use client';

import { useEffect, useRef, useState } from 'react';

import Image from 'next/image';

interface LazyVideoProps {
  webmSrc?: string;
  mp4Src: string;
  posterSrc?: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
}

export const LazyVideo = ({
  webmSrc,
  mp4Src,
  posterSrc,
  width = 800,
  height = 600,
  className = '',
  priority = false,
}: LazyVideoProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(priority);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isNetworkIdle, setIsNetworkIdle] = useState(priority);

  // Network idle check - code unchanged
  useEffect(() => {
    if (priority) return;

    // Network information API check
    if (
      'connection' in navigator &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      'onchange' in (navigator as any).connection
    ) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const connection = (navigator as any).connection;

      // Initial check
      if (
        connection.saveData === false &&
        (connection.effectiveType === '4g' || connection.downlink > 1.5)
      ) {
        setIsNetworkIdle(true);
      }

      // Listen for connection changes
      const updateNetworkStatus = () => {
        if (
          connection.saveData === false &&
          (connection.effectiveType === '4g' || connection.downlink > 1.5)
        ) {
          setIsNetworkIdle(true);
        }
      };

      connection.addEventListener('change', updateNetworkStatus);
      return () =>
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        connection.removeEventListener('change', updateNetworkStatus);
    } else {
      // Fallback: assume network is idle after a delay
      const timer = setTimeout(() => {
        setIsNetworkIdle(true);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [priority]);

  // Intersection observer code - unchanged
  useEffect(() => {
    if (priority) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.length && entries[0]!.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [priority]);

  // Video loading code - unchanged
  useEffect(() => {
    if (!videoRef.current || !(isVisible && isNetworkIdle)) return;

    if (webmSrc) {
      const webmSource = document.createElement('source');
      webmSource.src = webmSrc;
      webmSource.type = 'video/webm';
      videoRef.current.appendChild(webmSource);
    }

    const mp4Source = document.createElement('source');
    mp4Source.src = mp4Src;
    mp4Source.type = 'video/mp4';
    videoRef.current.appendChild(mp4Source);

    const handleLoaded = () => {
      setIsLoaded(true);
      if (videoRef.current) {
        videoRef.current.play().catch((e) => {
          console.warn('Autoplay failed:', e);
        });
      }
    };

    videoRef.current.addEventListener('loadeddata', handleLoaded);
    videoRef.current.load();

    return () => {
      if (videoRef.current) {
        videoRef.current.removeEventListener('loadeddata', handleLoaded);
      }
    };
  }, [isVisible, isNetworkIdle, webmSrc, mp4Src]);

  return (
    <div
      ref={containerRef}
      style={{ width: `${width}px`, height: `${height}px` }}
      className={`relative overflow-hidden ${className}`}
    >
      {!isLoaded && posterSrc && (
        <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800">
          <Image
            src={posterSrc}
            alt="Video thumbnail"
            width={width}
            height={height}
            priority={priority}
          />
        </div>
      )}

      <video
        ref={videoRef}
        width={width}
        height={height}
        preload={priority ? 'auto' : 'metadata'}
        poster={posterSrc}
        loop
        muted
        playsInline
        className={`transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
};
