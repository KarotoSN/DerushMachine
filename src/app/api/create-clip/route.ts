import { NextRequest, NextResponse } from 'next/server';
import { renderMedia, getCompositions } from '@remotion/renderer';
import path from 'path';
import fs from 'fs';


export async function POST(request: NextRequest) {
  try {
    const { videoUrl, moment } = await request.json();
    if (!videoUrl || !moment) {
      return NextResponse.json({ error: 'YouTube URL and moment data are required' }, { status: 400 });
    }

    // Ensure output directory exists
    const clipsDir = path.join(process.cwd(), 'public', 'clips');
    if (!fs.existsSync(clipsDir)) fs.mkdirSync(clipsDir, { recursive: true });

    // Use the built Remotion bundle
    const remotionBundle = path.join(process.cwd(), 'public', 'remotion-bundle');
    if (!fs.existsSync(remotionBundle)) {
      return NextResponse.json({ error: 'Remotion bundle not found. Run npx remotion bundle src/remotion/index.ts public/remotion-bundle first.' }, { status: 500 });
    }

    // Get compositions
    const compositions = await getCompositions(remotionBundle);
    const composition = compositions.find(c => c.id === 'TikTokClip');
    if (!composition) {
      return NextResponse.json({ error: 'TikTokClip composition not found in bundle.' }, { status: 500 });
    }

    // Render the video
    const outputFile = path.join(clipsDir, `tiktok-clip-${moment.moment_id}-${Date.now()}.mp4`);
    await renderMedia({
      composition,
      serveUrl: remotionBundle,
      codec: 'h264',
      outputLocation: outputFile,
      inputProps: {
        videoUrl,
        moment,
        caption: moment.suggested_caption_hook
      },
     
      onProgress: ({ progress }) => {
        console.log(`Rendering progress: ${Math.round(progress * 100)}%`);
      }
    });

    return NextResponse.json({
      clipPath: `/clips/${path.basename(outputFile)}`,
      success: true,
      message: 'TikTok clip created successfully!'
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to create clip',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}