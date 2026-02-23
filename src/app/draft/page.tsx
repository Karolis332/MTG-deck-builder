'use client';

import { useEffect, useState } from 'react';
import { isElectron, checkIsOverwolf } from '@/lib/electron-bridge';
import { DraftTracker } from '@/components/draft-tracker';

export default function DraftPage() {
  const [isOW, setIsOW] = useState<boolean | null>(null);

  useEffect(() => {
    checkIsOverwolf().then(setIsOW);
  }, []);

  if (!isElectron()) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="font-heading text-2xl text-primary mb-4">Draft Tracker</h1>
        <p className="text-muted-foreground">
          The draft tracker requires the desktop app.
        </p>
      </div>
    );
  }

  if (isOW === false) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="font-heading text-2xl text-primary mb-4">Draft Tracker</h1>
        <p className="text-muted-foreground mb-2">
          The draft tracker requires the Overwolf version of The Black Grimoire.
        </p>
        <p className="text-xs text-muted-foreground/60">
          Overwolf&apos;s Game Events Provider (GEP) captures draft pack and pick data
          directly from MTGA — this feature is not available in the standalone build.
        </p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-3.5rem)]">
      <DraftTracker />
    </div>
  );
}
