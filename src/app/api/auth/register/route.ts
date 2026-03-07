import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { registerSchema } from '@/lib/validations/auth';
import { verifyRecaptcha } from '@/lib/recaptcha';
import { sendOtpEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, name, recaptchaToken } = body;

    // 1. Verify reCAPTCHA
    if (!recaptchaToken) {
      return NextResponse.json({ error: 'reCAPTCHA token is required' }, { status: 400 });
    }
    const isHuman = await verifyRecaptcha(recaptchaToken);
    if (!isHuman) {
      return NextResponse.json({ error: 'reCAPTCHA verification failed' }, { status: 400 });
    }

    // 2. Validate Schema
    const result = registerSchema.safeParse({ email, password, name });
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.format() },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    // 3. Generate OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        isEmailVerified: false,
        emailOtp: otp,
        emailOtpExpires: otpExpires,
      },
    });

    // 4. Send Verification Email
    try {
      await sendOtpEmail({
        toEmail: email,
        otp,
      });
    } catch (emailError) {
      console.error('Failed to send OTP email:', emailError);
      // We don't fail registration if email fails, but in production we might want to
    }

    return NextResponse.json(
      { message: 'Registration successful. Please verify your email.', email: user.email },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
