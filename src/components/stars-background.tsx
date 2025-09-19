import React, { useEffect, useRef } from 'react';

export const StarsBackground: React.FC = () => {
  const starsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const createStar = () => {
      const star = document.createElement('div');
      star.className = 'star';
      star.style.left = Math.random() * 100 + '%';
      star.style.top = Math.random() * 100 + '%';
      star.style.animationDelay = Math.random() * 2 + 's';
      star.style.animationDuration = (Math.random() * 2 + 1) + 's';
      return star;
    };

    const container = starsRef.current;
    if (container) {
      // Create 50 stars
      for (let i = 0; i < 50; i++) {
        container.appendChild(createStar());
      }
    }

    return () => {
      if (container) {
        container.innerHTML = '';
      }
    };
  }, []);

  return <div ref={starsRef} className="stars" />;
};