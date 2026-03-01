import { NextResponse } from 'next/server';

// Card timeline/movement log removed — CardMovementLog table eliminated in schema optimization.
export async function GET() {
  return NextResponse.json(
    { error: 'Card timeline has been removed. CardMovementLog table was eliminated for write optimization.' },
    { status: 410 }
  );
}
