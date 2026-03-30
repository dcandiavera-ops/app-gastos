import { NextResponse } from 'next/server';
import { getOptionalAuthUser } from '@/lib/auth';
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

    const updatedUser = await prisma.user.upsert({
      where: { id: user.id },
      update: {
        email: user.email ?? `${user.id}@placeholder.invalid`,
        name:
          typeof user.user_metadata?.name === 'string' && user.user_metadata.name.trim().length > 0
            ? user.user_metadata.name.trim()
            : null,
        monthlyBudget: parsedBudget,
      },
      create: {
        id: user.id,
        email: user.email ?? `${user.id}@placeholder.invalid`,
        name:
          typeof user.user_metadata?.name === 'string' && user.user_metadata.name.trim().length > 0
            ? user.user_metadata.name.trim()
            : null,
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
