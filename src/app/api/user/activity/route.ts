import { NextResponse } from 'next/server';

// Activity log removed — AuditLog table eliminated in schema optimization.
// The Activity tab in the dashboard has been replaced.
export async function GET() {
  return NextResponse.json(
    { error: 'Activity feed has been removed. AuditLog table was eliminated for write optimization.' },
    { status: 410 }
  );
}
