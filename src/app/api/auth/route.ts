import { NextRequest, NextResponse } from 'next/server';
import { hashPin, SESSION_COOKIE_NAME } from '@/lib/vault';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const pin = body?.pin;

    if (!pin || typeof pin !== 'string' || !pin.trim()) {
      return NextResponse.json(
        { error: 'Ghost Key (PIN) is required' },
        { status: 400 }
      );
    }

    const vaultHash = hashPin(pin);

    const response = NextResponse.json({
      success: true,
      message: 'Access Granted to secure vault',
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: vaultHash,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: 'Invalid authentication request' },
      { status: 400 }
    );
  }
}
