import { createElement, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { FEED_ID } from './ads';

/**
 * Full-card ad that sits where the next profile / next short would be.
 *
 * variant="deck"   -> swipe LEFT on the grey area around the ad (or tap X) to remove it
 * variant="shorts" -> tap X (or swipe UP on the grey area around the ad) to remove it
 * Tapping the ad itself opens it (handled natively by Google's SDK).
 *
 * Put it inside a container that is position:relative and the same size as
 * the profile card / video.
 */
export default function AdCard({ slotKey, variant = 'deck', onClose }) {
  const start = useRef(null);

  // On a normal browser there are no native ads, so just skip it
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) onClose();
  }, [onClose]);
  if (!Capacitor.isNativePlatform()) return null;

  const onTouchStart = (e) => {
    const t = e.touches[0];
    start.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e) => {
    if (!start.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.current.x;
    const dy = t.clientY - start.current.y;
    start.current = null;
    if (variant === 'deck' && dx < -60 && Math.abs(dx) > Math.abs(dy)) onClose();
    if (variant === 'shorts' && dy < -60 && Math.abs(dy) > Math.abs(dx)) onClose();
  };

  // In Shorts the page header sits at the top, so start the ad just below it
  const top = variant === 'shorts' ? 'calc(env(safe-area-inset-top, 0px) + 60px)' : '0px';

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 20,
        background: variant === 'shorts' ? '#000' : '#111',
        display: 'flex',
        flexDirection: 'column',
        padding: `calc(${top} + 56px) 16px 72px`,
        boxSizing: 'border-box',
        borderRadius: variant === 'deck' ? 16 : 0,
      }}
    >
      <span style={{ position: 'absolute', top: `calc(${top} + 18px)`, left: 16, color: '#aaa', fontSize: 13 }}>
        Sponsored
      </span>

      <button
        aria-label="Close ad"
        onClick={onClose}
        style={{
          position: 'absolute',
          top: `calc(${top} + 8px)`,
          right: 12,
          width: 40,
          height: 40,
          borderRadius: 20,
          border: 'none',
          background: 'rgba(255,255,255,0.18)',
          color: '#fff',
          fontSize: 22,
          lineHeight: '40px',
          padding: 0,
          zIndex: 30,
        }}
      >
        ✕
      </button>

      <div style={{ flex: 1, minHeight: 300, position: 'relative' }}>
        {createElement('capacitor-admob-native', {
          'feed-id': FEED_ID,
          'slot-key': slotKey,
          style: { display: 'block', width: '100%', height: '100%' },
        })}
      </div>

      <span
        style={{
          position: 'absolute',
          bottom: 24,
          left: 0,
          right: 0,
          textAlign: 'center',
          color: '#888',
          fontSize: 13,
        }}
      >
        {variant === 'deck' ? 'Swipe left to skip' : 'Swipe up or tap ✕ to skip'}
      </span>
    </div>
  );
}
