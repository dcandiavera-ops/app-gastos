import { NextResponse } from 'next/server';
import { getOptionalAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getOptionalAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
      },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(transactions);
  } catch (error) {
    console.error('DB Error:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getOptionalAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { amount, date, description, type, categoryId, suggestedCategoryName, suggestedCategoryColor } = await request.json();
    const parsedAmount = Number(amount);
    const parsedDate = date ? new Date(date) : new Date();
    const normalizedType = type === 'INCOME' ? 'INCOME' : 'EXPENSE';
    const normalizedDescription =
      typeof description === 'string' && description.trim().length > 0
        ? description.trim()
        : normalizedType === 'INCOME'
          ? 'Ingreso manual'
          : 'Gasto manual';

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    if (Number.isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
    }

    let resolvedCategoryId: string | null =
      typeof categoryId === 'string' && categoryId.length > 0 ? categoryId : null;

    if (!resolvedCategoryId && normalizedType === 'EXPENSE' && typeof suggestedCategoryName === 'string' && suggestedCategoryName.trim().length > 0) {
      const normalizedCategoryName = suggestedCategoryName.trim();
      const existingCategory = await prisma.category.findFirst({
        where: {
          name: {
            equals: normalizedCategoryName,
            mode: 'insensitive',
          },
        },
      });

      if (existingCategory) {
        resolvedCategoryId = existingCategory.id;
      } else {
        const createdCategory = await prisma.category.create({
          data: {
            name: normalizedCategoryName,
            color:
              typeof suggestedCategoryColor === 'string' && suggestedCategoryColor.trim().length > 0
                ? suggestedCategoryColor.trim()
                : '#AAFFDC',
          },
        });

        resolvedCategoryId = createdCategory.id;
      }
    }

    const transaction = await prisma.transaction.create({
      data: {
        amount: parsedAmount,
        date: parsedDate,
        description: normalizedDescription,
        type: normalizedType,
        categoryId: resolvedCategoryId,
        userId: user.id,
      },
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error('DB POST Error:', error);
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 });
  }
}
