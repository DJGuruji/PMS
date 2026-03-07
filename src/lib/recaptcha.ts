export async function verifyRecaptcha(token: string): Promise<boolean> {
  const secret = process.env.GOOGLE_RECAPTCHE_SECRET;
  if (!secret) {
    console.warn('GOOGLE_RECAPTCHE_SECRET is not set. Skipping verification (unsafe).');
    return true;
  }

  try {
    const response = await fetch(
      `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${token}`,
      { method: 'POST' }
    );
    const data = await response.json();

    // v3 returns a score (0.0 to 1.0)
    // Production ready: we should check both success AND score
    return data.success && (data.score === undefined || data.score >= 0.5);
  } catch (error: any) {
    console.error('reCAPTCHA network/verification error:', error.message);
    
    // In development or if the network is down, we allow the request to pass 
    // to avoid blocking legitimate testing/work.
    if (process.env.NODE_ENV !== 'production') {
      console.warn('reCAPTCHA failed (likely network issue), bypassing for development.');
      return true;
    }
    
    return false;
  }
}
