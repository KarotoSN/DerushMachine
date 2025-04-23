import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini API with your API key
// Note: In production, you should store this in environment variables
const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

export interface FunnyMoment {
  moment_id: number;
  description: string;
  timestamp_start: string;
  timestamp_end: string;
  duration_seconds: number;
  why_its_tiktok_funny: string;
  suggested_caption_hook: string;
}

export interface GeminiResponse {
  funniest_moments_list: FunnyMoment[];
}

// Helper function to extract video ID from YouTube URL
function extractYouTubeVideoId(url: string): string | null {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : null;
}

// Helper function to fetch video metadata (title, channel, etc.)
// This helps provide context to the AI for better analysis
async function fetchVideoMetadata(videoId: string): Promise<any> {
  try {
    // This is a mock function since we can't make actual YouTube API calls without a key
    // In a production environment, you would use the YouTube Data API
    // For now, we'll return empty data that the AI will work with
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

export async function analyzeFunnyMoments(videoUrl: string): Promise<GeminiResponse> {
  try {
    // For safety, ensure we have an API key
    if (!API_KEY) {
      throw new Error('Missing Gemini API key');
    }

    // Extract video ID for metadata lookup
    const videoId = extractYouTubeVideoId(videoUrl);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }

    // Try to fetch video metadata to provide more context
    const metadata = await fetchVideoMetadata(videoId);
    const videoInfo = metadata ? 
      `Title: "${metadata.title}", Channel: "${metadata.channelName}", Category: "${metadata.category}"` : 
      `Video ID: ${videoId}`;

    // Get the Gemini Pro model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Enhanced prompt for funny moment analysis with a clearer understanding of what makes TikTok content viral
    const prompt = `
    You are an expert TikTok content analyst with deep knowledge of what makes videos go viral on social platforms. 
    You're analyzing this YouTube video: ${videoUrl} (${videoInfo})

    I know you cannot actually watch the video, but I need you to use your knowledge of viral content to identify potential funny moments that could be extracted as TikTok clips.

    You should think like a professional content creator who knows:
    1. The exact types of moments that perform well on TikTok (surprising reactions, funny fails, clever comebacks, etc.)
    2. How to identify the perfect clip length (typically 8-30 seconds)
    3. Where natural "cut points" should be in a video for maximum humor impact
    4. What kind of captions generate high engagement
    
    Generate 5-8 moments that would be perfect for TikTok clips. For each moment, follow these guidelines:
    
    1. REALISTIC MOMENTS: Infer plausible funny moments based on the video title, channel type, and common structures in viral videos
    2. PRECISE TIMESTAMPS: Create mathematically correct timestamps that represent realistic video segments
    3. VARIED HUMOR TYPES: Include different kinds of humor (reaction shots, slapstick, verbal humor, unexpected moments)
    4. VIRAL POTENTIAL: Focus on moments that would genuinely generate interest and shares
    5. PERFECT DURATION: Keep clip durations between 8-30 seconds (ideal for TikTok)

    Provide details for each moment in a JSON array within a root JSON object named 'funniest_moments_list'.

    Each object should have:
    {
      "moment_id": number (sequential starting from 1),
      "description": "A specific, detailed description of exactly what happens in this funny moment",
      "timestamp_start": "HH:MM:SS" (precise timestamp where the funny moment begins),
      "timestamp_end": "HH:MM:SS" (precise timestamp where the funny moment ends - typically 8-30 seconds later),
      "duration_seconds": number (calculated exactly from timestamps),
      "why_its_tiktok_funny": "Detailed explanation of why this specific moment would work well on TikTok, including the humor type and audience appeal",
      "suggested_caption_hook": "An attention-grabbing caption that would drive engagement"
    }
    
    Return ONLY the JSON object without any additional text or markdown formatting. Ensure timestamps and duration calculations are mathematically correct.
    `;

    // Make the request to Gemini with a longer response timeout
    const generationConfig = {
      temperature: 0.7,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 4096,
    };
    
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig,
    });
    
    const response = await result.response;
    const textResponse = response.text();

    // Better JSON extraction with more robust error handling
    try {
      // First try direct parsing in case the response is clean JSON
      return JSON.parse(textResponse) as GeminiResponse;
    } catch (parseError) {
      // If direct parsing fails, try to extract JSON using regex
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('Failed to extract JSON from response');
      }
      
      try {
        return JSON.parse(jsonMatch[0]) as GeminiResponse;
      } catch (nestedParseError) {
        console.error('JSON parsing error:', nestedParseError);
        throw new Error('Invalid JSON response from Gemini');
      }
    }
  } catch (error) {
    console.error('Error analyzing video:', error);
    throw error;
  }
}