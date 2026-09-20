import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyPassword, createToken } from '@/lib/auth';
import { getUserByUsername, getUserByEmail } from '@/lib/db';

const loginSchema = z.object({
  username: z.string().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { username, password } = parsed.data;
    // The field is labelled "username or email": the setup wizard stores both, and people
    // type the address they used on the web. Username first (exact), then email.
    const trimmed = username.trim();
    const user = getUserByUsername(trimmed) ?? (trimmed.includes('@') ? getUserByEmail(trimmed) : undefined);

    if (!user) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    const valid = verifyPassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    const token = await createToken(user.id, user.username);

    const response = NextResponse.json({
      user: { id: user.id, username: user.username, email: user.email },
    });

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
