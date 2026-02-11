import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'The Black Grimoire — Overlay',
};

export default function OverlayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 0,
          background: 'transparent',
          overflow: 'hidden',
          fontFamily: "'Segoe UI', -apple-system, sans-serif",
          color: '#d4c4a8',
          fontSize: '12px',
          userSelect: 'none',
          WebkitAppRegion: 'drag',
        } as React.CSSProperties}
      >
        {children}
      </body>
    </html>
  );
}
