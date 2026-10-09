import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Memory cache fallback for serverless/readonly environments
const memoryCache = (globalThis as any).__INVOICE_IMAGE_CACHE__ || new Map<string, Buffer>();
(globalThis as any).__INVOICE_IMAGE_CACHE__ = memoryCache;

import { INVOICES_DIR } from '@/lib/db';

function ensureInvoicesDir() {
  try {
    if (!fs.existsSync(INVOICES_DIR)) {
      fs.mkdirSync(INVOICES_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn('Could not create invoices dir:', err);
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Missing invoice id' }, { status: 400 });
    }

    // Check in-memory cache first
    if (memoryCache.has(id)) {
      const buffer = memoryCache.get(id)!;
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Content-Disposition': `inline; filename="${id}.png"`,
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200',
        },
      });
    }

    // Check disk
    const filePath = path.join(INVOICES_DIR, `${id}.png`);
    if (fs.existsSync(filePath)) {
      const buffer = fs.readFileSync(filePath);
      memoryCache.set(id, buffer);
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Content-Disposition': `inline; filename="${id}.png"`,
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200',
        },
      });
    }

    return NextResponse.json({ error: 'Invoice image not found' }, { status: 404 });
  } catch (err: any) {
    console.error('Error serving invoice image:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const imageDataUrl: string = body.image || body.imageDataUrl || '';

    if (!imageDataUrl || !imageDataUrl.includes('base64,')) {
      return NextResponse.json({ error: 'Invalid base64 image data' }, { status: 400 });
    }

    const base64Content = imageDataUrl.split('base64,')[1];
    const buffer = Buffer.from(base64Content, 'base64');

    // Save to memory cache
    memoryCache.set(id, buffer);

    // Save to filesystem if writable
    ensureInvoicesDir();
    try {
      const filePath = path.join(INVOICES_DIR, `${id}.png`);
      fs.writeFileSync(filePath, buffer);
    } catch (fsErr) {
      console.warn('Could not write image to disk (using memory cache):', fsErr);
    }

    return NextResponse.json({
      success: true,
      url: `/api/invoices/${id}/image`,
    });
  } catch (err: any) {
    console.error('Error saving invoice image:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
