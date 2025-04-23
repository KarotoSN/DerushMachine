import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { FunnyMoment } from '@/components/FunnyMomentsList';

// Initialize the Gemini API
const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

// Helper function to extract video ID from YouTube URL
function extractYouTubeVideoId(url: string): string | null {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : null;
}

// Helper function to fetch video metadata (title, channel, etc.)
async function fetchVideoMetadata(videoId: string): Promise<any> {
  try {
    // This is a mock function since we can't make actual YouTube API calls without a key
    // In a production environment, you would use the YouTube Data API
    return {
      title: '',
      channelName: '',
      category: '',
      tags: []
    };
  } catch (error) {
    console.error('Error fetching video metadata:', error);
    return null;
  }
}

// Parse time hint from user instruction (e.g. "around 2:35" -> 155 seconds)
function parseTimeHint(instruction: string): number | null {
  // Look for patterns like "2:35", "02:35", "1:23:45"
  const timeRegex = /(\d{1,2}):(\d{2})(?::(\d{2}))?/g;
  const matches = [...instruction.matchAll(timeRegex)];
  
  if (matches.length > 0) {
    const match = matches[0];
    const hours = match[3] ? parseInt(match[1]) : 0;
    const minutes = match[3] ? parseInt(match[2]) : parseInt(match[1]);
    const seconds = match[3] ? parseInt(match[3]) : parseInt(match[2]);
    
    return hours * 3600 + minutes * 60 + seconds;
  }
  
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { videoUrl, instruction } = await request.json();
    
    if (!videoUrl || !instruction) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    console.log('Finding custom moment with instruction:', instruction);

    // Extract video ID
    const videoId = extractYouTubeVideoId(videoUrl);
    if (!videoId) {
      return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
    }

    // Try to fetch video metadata
    const metadata = await fetchVideoMetadata(videoId);
    const videoInfo = metadata ? 
      `Title: "${metadata.title}", Channel: "${metadata.channelName}"` : 
      `Video ID: ${videoId}`;
    
    // Extract any time hints from the instruction
    const timeHint = parseTimeHint(instruction);
    const timeHintText = timeHint ? 
      `The user mentioned a timestamp around ${Math.floor(timeHint/60)}:${(timeHint%60).toString().padStart(2, '0')}. Focus your search near this timestamp.` : 
      'No specific timestamp was mentioned, so estimate where this moment might occur based on the description.';

    // Get the Gemini Pro model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Enhanced prompt for finding specific moments with clearer instructions
    const prompt = `
    You are an expert TikTok content analyst who specializes in finding the perfect viral moments in videos.
    
    I need you to find a specific moment in this YouTube video: ${videoUrl} (${videoInfo})
    
    The user is looking for: "${instruction}"
    
    ${timeHintText}
    
    Even though you cannot actually watch the video, analyze the request and use your expertise to:
    
    1. PRECISE INTERPRETATION: Determine exactly what kind of moment the user is looking for
    2. ACCURATE TIMING: Estimate when this moment would occur in the video
    3. PERFECT DURATION: Create a clip of just the right length (between 5-15 seconds) to capture the essence of the moment
    4. VIRAL POTENTIAL: Explain why this specific moment would perform well on TikTok
    5. ENGAGING CAPTION: Create a caption that would make viewers want to engage with the content
    
    Please provide a JSON object for this specific moment with:
    {
      "moment_id": ${Date.now()},
      "description": "A precise, detailed description of exactly what happens in this moment",
      "timestamp_start": "HH:MM:SS" (the exact time where the moment begins),
      "timestamp_end": "HH:MM:SS" (the time where the moment ends, creating a perfect clip),
      "duration_seconds": number (calculated exactly from timestamps),
      "why_its_tiktok_funny": "A detailed explanation of why this specific moment would perform well on TikTok, focusing on virality factors",
      "suggested_caption_hook": "An attention-grabbing, engaging caption that would drive likes and shares"
    }
    
    Return ONLY the JSON object with no additional text. Ensure timestamps are mathematically correct and follow the HH:MM:SS format.
    `;

    // Make the request to Gemini with specific generation parameters
    const generationConfig = {
      temperature: 0.6,  // Slightly lower temperature for more focused responses
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 2048,
    };
    
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig,
    });
    
    const response = await result.response;
    const textResponse = response.text();

    // Parse the JSON response
    try {
      // First try direct parsing in case the response is clean JSON
      const moment = JSON.parse(textResponse) as FunnyMoment;
      return NextResponse.json(moment);
    } catch (parseError) {
      // If direct parsing fails, try to extract JSON using regex
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        return NextResponse.json(
          { error: 'Failed to extract moment information' },
          { status: 500 }
        );
      }
      
      try {
        const moment = JSON.parse(jsonMatch[0]) as FunnyMoment;
        return NextResponse.json(moment);
      } catch (nestedParseError) {
        console.error('JSON parsing error:', nestedParseError);
        return NextResponse.json(
          { error: 'Invalid response format' },
          { status: 500 }
        );
      }
    }
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Failed to find moment', message: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}