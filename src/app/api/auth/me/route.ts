import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-middleware';
import { getUserById } from '@/lib/db';

export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) return unauthorizedResponse();

  const user = getUserById(authUser.userId);
  if (!user) return unauthorizedResponse();

  return NextResponse.json({
    user: { id: user.id, username: user.username, email: user.email },
  });
}
