import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './auth';

export interface AuthenticatedUser {
  userId: number;
  username: string;
}

export async function getAuthUser(
  request: NextRequest
): Promise<AuthenticatedUser | null> {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
}
