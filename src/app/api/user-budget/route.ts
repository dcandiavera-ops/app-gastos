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

    const { monthlyBudget } = await request.json();
    const parsedBudget = Number(monthlyBudget);

    if (!Number.isFinite(parsedBudget) || parsedBudget <= 0) {
      return NextResponse.json({ error: 'Invalid monthly budget' }, { status: 400 });
    }

    await ensureDbUser(user);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        monthlyBudget: parsedBudget,
      },
      select: { monthlyBudget: true },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Budget PATCH Error:', error);
    return NextResponse.json({ error: 'Failed to update monthly budget' }, { status: 500 });
  }
}
