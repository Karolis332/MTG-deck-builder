import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { hashPassword, createToken } from '@/lib/auth';
import { createUser, getUserByUsername, getUserByEmail } from '@/lib/db';

const registerSchema = z
  .object({
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username must be at most 30 characters')
      .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores'),
    email: z.string().email('Invalid email address'),
    // Normal signups send a plaintext password (hashed below). The Electron
    // first-boot flow (electron/setup-handlers.ts) sends an already-hashed
    // passwordHash instead, so the plaintext password never touches disk.
    password: z.string().min(8, 'Password must be at least 8 characters').optional(),
    passwordHash: z
      .string()
      .regex(/^[0-9a-f]{32}:[0-9a-f]{128}$/, 'Invalid password hash format')
      .optional(),
  })
  .refine((data) => data.password || data.passwordHash, {
    message: 'Password is required',
    path: ['password'],
  });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { username, email, password, passwordHash: preHashed } = parsed.data;

    if (getUserByUsername(username)) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
    }

    if (getUserByEmail(email)) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const passwordHash = preHashed ?? hashPassword(password!);
    const user = createUser(username, email, passwordHash);
    const token = await createToken(user.id, user.username);

    const response = NextResponse.json(
      { user: { id: user.id, username: user.username, email: user.email } },
      { status: 201 }
    );

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Registration failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
