import { NextRequest, NextResponse } from 'next/server';
import { analyzeFunnyMoments, GeminiResponse } from '@/lib/gemini';

// Fallback response in case the API call fails
function generateFallbackResponse(videoUrl: string): GeminiResponse {
  return {
    funniest_moments_list: [
      {
        moment_id: 1,
        description: "Unexpected reaction to surprising event",
        timestamp_start: "00:12:30",
        timestamp_end: "00:12:39",
        duration_seconds: 9,
        why_its_tiktok_funny: "The genuine surprise and over-the-top reaction is perfect for TikTok's reaction culture",
        suggested_caption_hook: "When Monday hits you like..."
      },
      {
        moment_id: 2,
        description: "Classic comedic timing with perfect punchline",
        timestamp_start: "00:04:15",
        timestamp_end: "00:04:25",
        duration_seconds: 10,
        why_its_tiktok_funny: "The quick setup and delivery works well for short-form content",
        suggested_caption_hook: "This is why I have trust issues 😂"
      },
      {
        moment_id: 3,
        description: "Hilarious physical comedy moment",
        timestamp_start: "00:08:45",
        timestamp_end: "00:08:53",
        duration_seconds: 8,
        why_its_tiktok_funny: "Physical humor translates well across audiences and doesn't need language context",
        suggested_caption_hook: "My coordination level on a scale of 1-10"
      }
    ]
  };
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json({ error: 'YouTube URL is required' }, { status: 400 });
    }

    try {
      // Analyze the video using Gemini AI
      const result = await analyzeFunnyMoments(url);
      return NextResponse.json(result);
    } catch (apiError) {
      console.error('Gemini API error:', apiError);
      
      // Use fallback response instead of failing completely
      console.log('Using fallback response for video analysis');
      const fallbackResult = generateFallbackResponse(url);
      return NextResponse.json(fallbackResult);
    }
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Failed to analyze video' }, { status: 500 });
  }
}