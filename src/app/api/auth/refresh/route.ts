import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyRefreshToken, signAccessToken, signRefreshToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const refreshToken = req.cookies.get('refreshToken')?.value;

    if (!refreshToken) {
      return NextResponse.json({ error: 'Refresh token missing' }, { status: 401 });
    }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 });
    }

    const savedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!savedToken || savedToken.expiresAt < new Date()) {
      // If token is reused or expired, we should revoke all user tokens for security (optional)
      if (savedToken) {
        await prisma.refreshToken.delete({ where: { id: savedToken.id } });
      }
      return NextResponse.json({ error: 'Invalid or expired refresh token' }, { status: 401 });
    }

    // Refresh Token Rotation: Revoke current and issue new
    await prisma.refreshToken.delete({ where: { id: savedToken.id } });

    const newAccessToken = signAccessToken({
      userId: savedToken.user.id,
      email: savedToken.user.email,
      role: savedToken.user.role,
    });

    const newRefreshToken = signRefreshToken(savedToken.user.id);

    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: savedToken.user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const response = NextResponse.json({ accessToken: newAccessToken });

    response.cookies.set({
      name: 'refreshToken',
      value: newRefreshToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60,
    });

    response.cookies.set({
      name: 'accessToken',
      value: newAccessToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60,
    });

    return response;
  } catch (error) {
    console.error('Refresh token error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
