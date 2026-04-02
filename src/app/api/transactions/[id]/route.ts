import { NextResponse } from 'next/server';
import { getOptionalAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getOptionalAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const { amount, date, description, type, categoryId, paymentMethod } = await request.json();

    const parsedAmount = Number(amount);
    const parsedDate = new Date(date);
    const normalizedType = type === 'INCOME' ? 'INCOME' : 'EXPENSE';

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    if (Number.isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
    }

    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existingTransaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    const updatedTransaction = await prisma.transaction.update({
      where: { id },
      data: {
        amount: parsedAmount,
        date: parsedDate,
        description:
          typeof description === 'string' && description.trim().length > 0
            ? description.trim()
            : normalizedType === 'INCOME'
              ? 'Ingreso manual'
              : 'Gasto manual',
        type: normalizedType,
        paymentMethod: paymentMethod === 'CREDIT' ? 'CREDIT' : 'CASH',
        categoryId:
          normalizedType === 'EXPENSE' && typeof categoryId === 'string' && categoryId.length > 0
            ? categoryId
            : null,
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json(updatedTransaction);
  } catch (error) {
    console.error('DB PATCH Error:', error);
    return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 });
  }
}
