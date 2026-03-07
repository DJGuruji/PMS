import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyRecaptcha } from '@/lib/recaptcha';
import { sendPasswordResetEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const { email, recaptchaToken } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // 1. Verify reCAPTCHA
    if (!recaptchaToken) {
        return NextResponse.json({ error: 'reCAPTCHA token is required' }, { status: 400 });
    }
    const isHuman = await verifyRecaptcha(recaptchaToken);
    if (!isHuman) {
      return NextResponse.json({ error: 'reCAPTCHA verification failed' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Production ready security: Don't reveal if user exists
    if (!user) {
      return NextResponse.json({ message: 'If an account exists, a reset link has been sent.' }, { status: 200 });
    }

    // 2. Generate Reset Token (Secure Hex String)
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { email },
      data: {
        resetToken: token,
        resetTokenExpires: expires,
      },
    });

    // 3. Send Email
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    try {
      await sendPasswordResetEmail({
        toEmail: email,
        token,
        appUrl,
      });
    } catch (emailError) {
      console.error('Password reset email error:', emailError);
    }

    return NextResponse.json({ message: 'If an account exists, a reset link has been sent.' }, { status: 200 });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
