import { NextResponse } from 'next/server';
import { ensureDbUser, getOptionalAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request) {
  try {
    const user = await getOptionalAuthUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data: Record<string, number> = {};

    if (body.monthlyBudget !== undefined) {
      const parsed = Number(body.monthlyBudget);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return NextResponse.json({ error: 'Invalid monthly budget' }, { status: 400 });
      }
      data.monthlyBudget = parsed;
    }

    if (body.creditBudget !== undefined) {
      const parsed = Number(body.creditBudget);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return NextResponse.json({ error: 'Invalid credit budget' }, { status: 400 });
      }
      data.creditBudget = parsed;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    await ensureDbUser(user);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data,
      select: { monthlyBudget: true, creditBudget: true },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Budget PATCH Error:', error);
    return NextResponse.json({ error: 'Failed to update budget' }, { status: 500 });
  }
}
