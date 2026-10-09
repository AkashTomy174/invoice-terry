import { NextResponse } from 'next/server';
import { readDb } from '@/lib/db';
import { getServerSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    const db = readDb();
    const user = db.users.find((u) => u.id === session.id);

    if (!user) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
    });
  } catch {
    return NextResponse.json({ authenticated: false, user: null });
  }
}
