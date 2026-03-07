import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyRecaptcha } from '@/lib/recaptcha';

export async function POST(req: Request) {
  try {
    const { email, otp, recaptchaToken } = await req.json();

    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 });
    }

    // 1. Verify reCAPTCHA
    if (recaptchaToken) {
      const isHuman = await verifyRecaptcha(recaptchaToken);
      if (!isHuman) {
        return NextResponse.json({ error: 'reCAPTCHA verification failed' }, { status: 400 });
      }
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.isEmailVerified) {
      return NextResponse.json({ message: 'Email already verified' }, { status: 200 });
    }

    if (!user.emailOtp || !user.emailOtpExpires) {
      return NextResponse.json({ error: 'No verification code found' }, { status: 400 });
    }

    if (new Date() > user.emailOtpExpires) {
      return NextResponse.json({ error: 'Verification code expired' }, { status: 400 });
    }

    if (user.emailOtp !== otp) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
    }

    // 2. Clear OTP and mark as verified
    await prisma.user.update({
      where: { email },
      data: {
        isEmailVerified: true,
        emailOtp: null,
        emailOtpExpires: null,
      },
    });

    return NextResponse.json({ message: 'Email verified successfully' }, { status: 200 });
  } catch (error) {
    console.error('OTP Verification error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
