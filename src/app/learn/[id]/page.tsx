'use client';

import { useParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import OpeningTrainer from '@/components/OpeningTrainer';
import { getOpeningById } from '@/data/openings';

export default function LearnOpeningPage() {
  const params = useParams();
  const id = params.id as string;
  const opening = getOpeningById(id);

  if (!opening) {
    return (
      <AppShell>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <h1>Opening not found</h1>
          <p style={{ color: '#999' }}>
            The opening &ldquo;{id}&rdquo; doesn&apos;t exist.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <OpeningTrainer opening={opening} />
    </AppShell>
  );
}
