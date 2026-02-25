import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const refreshToken = req.headers.get('cookie')
      ?.split('; ')
      .find(row => row.startsWith('refreshToken='))
      ?.split('=')[1];

    if (refreshToken) {
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      });
    }

    const response = NextResponse.json({ message: 'Logged out successfully' });

    response.cookies.set({
      name: 'refreshToken',
      value: '',
      httpOnly: true,
      expires: new Date(0),
      path: '/',
    });
    
    response.cookies.set({
      name: 'accessToken',
      value: '',
      httpOnly: true,
      expires: new Date(0),
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
