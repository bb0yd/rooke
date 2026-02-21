import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  return NextResponse.json({ userId: payload.userId, username: payload.username });
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set('token', '', { httpOnly: true, maxAge: 0, path: '/' });
  return response;
}
