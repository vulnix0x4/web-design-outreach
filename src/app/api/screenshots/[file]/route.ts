import fs from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface Params {
  params: Promise<{
    file: string;
  }>;
}

export async function GET(_: NextRequest, { params }: Params): Promise<NextResponse> {
  const { file } = await params;
  const fileName = path.basename(decodeURIComponent(file));
  const filePath = path.join(process.cwd(), 'data', 'screenshots', fileName);

  try {
    const buffer = await fs.readFile(filePath);
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch {
    return NextResponse.json({ error: 'Screenshot not found.' }, { status: 404 });
  }
}
