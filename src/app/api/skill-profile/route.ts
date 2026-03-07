import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { computeLiveSkillProfile, persistSkillProfile } from '@/lib/learnerState';

function getUserId(req: NextRequest): number | null {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.userId ?? null;
}

// GET: Read-only — return the live skill profile computed from the latest evidence.
export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const profile = await computeLiveSkillProfile(userId);
  return NextResponse.json(profile);
}

// POST: Recompute and persist the skill profile + record history.
// Call this after analysis completes or training session finishes.
export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const profile = await persistSkillProfile(userId);
  return NextResponse.json(profile);
}
