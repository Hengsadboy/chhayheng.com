import { NextResponse } from 'next/server';
import { getCategories, saveCategories } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const list = getCategories();
    return NextResponse.json(list);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name } = await request.json();
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    const trimmed = name.trim();
    if (!trimmed) {
      return NextResponse.json({ error: 'Category name cannot be empty' }, { status: 400 });
    }

    const list = getCategories();
    if (list.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      return NextResponse.json({ error: 'Category already exists' }, { status: 400 });
    }

    list.push(trimmed);
    saveCategories(list);

    return NextResponse.json(list, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { name } = await request.json();
    if (!name) {
      return NextResponse.json({ error: 'Category name is required to delete' }, { status: 400 });
    }

    const list = getCategories();
    const updated = list.filter(c => c.toLowerCase() !== name.toLowerCase());

    if (list.length === updated.length) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    saveCategories(updated);
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}
