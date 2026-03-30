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
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error('DB Error:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getOptionalAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { name, color } = await request.json();

    if (typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        color: typeof color === 'string' && color.trim().length > 0 ? color.trim() : '#AAFFDC',
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('DB POST Error:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}
