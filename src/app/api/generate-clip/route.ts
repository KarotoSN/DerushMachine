import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import ytdl from 'ytdl-core';

// Rotate between different user agents to improve extraction success rate
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  // Adding more recent agents
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
];

// Add retry mechanism for ytdl-core requests
async function getVideoInfoWithRetry(videoId: string, maxRetries = 3): Promise<ytdl.videoInfo | null> {
  let lastError: Error | null = null;
  
  // Try different user agents
  for (let i = 0; i < maxRetries; i++) {
    try {
      const userAgent = getRandomUserAgent();
      console.log(`Attempt ${i + 1}/${maxRetries} with user agent: ${userAgent.substring(0, 20)}...`);
      
      const videoInfo = await ytdl.getInfo(videoId, {
        requestOptions: {
          headers: {
            'User-Agent': userAgent,
          }
        }
      });
      
      return videoInfo;
    } catch (error: any) {
      lastError = error;
      console.error(`Attempt ${i + 1} failed:`, error.message);
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  if (lastError) {
    console.error('All attempts failed. Last error:', lastError);
  }
  return null;
}

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// Convert timestamp string (HH:MM:SS) to seconds
function timestampToSeconds(timestamp: string): number {
  const parts = timestamp.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

// Create a shareable YouTube URL with timestamps for TikTok reference
function createShareableYouTubeUrl(videoId: string, startSeconds: number): string {
  return `https://www.youtube.com/watch?v=${videoId}&t=${startSeconds}s`;
}

// Create a YouTube embed URL for preview within the app
function createYouTubeEmbedUrl(videoId: string, startSeconds: number, endSeconds: number): string {
  return `https://www.youtube.com/embed/${videoId}?start=${startSeconds}&end=${endSeconds}&autoplay=1`;
}

// Extract thumbnail URL from YouTube video info
function getBestThumbnailUrl(videoInfo: ytdl.videoInfo): string {
  try {
    const thumbnails = videoInfo.videoDetails.thumbnails;
    // Sort by resolution and get the highest quality
    const sortedThumbnails = [...thumbnails].sort((a, b) => 
      (b.width || 0) * (b.height || 0) - (a.width || 0) * (a.height || 0)
    );
    
    return sortedThumbnails.length > 0 ? sortedThumbnails[0].url : '';
  } catch (e) {
    return '';
  }
}

// Enhanced backup method to get video info when ytdl-core fails
async function getBackupVideoInfo(videoId: string): Promise<{title: string, thumbnailUrl: string}> {
  try {
    // First try oEmbed API which is more stable than scraping
    const response = await axios.get(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    return {
      title: response.data.title || 'YouTube Video',
      thumbnailUrl: response.data.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`
    };
  } catch (error) {
    console.error('Error in oEmbed API:', error);
    
    // Second fallback: Try to get info from Invidious API (public YouTube API alternative)
    try {
      const invidious = 'https://invidious.snopyta.org/api/v1/videos/';
      const invidiousResponse = await axios.get(`${invidious}${videoId}`, { 
        timeout: 5000,
        headers: { 'User-Agent': getRandomUserAgent() }
      });
      
      if (invidiousResponse.data && invidiousResponse.data.title) {
        return {
          title: invidiousResponse.data.title,
          thumbnailUrl: invidiousResponse.data.videoThumbnails?.[0]?.url || 
                        `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`
        };
      }
    } catch (invidiousError) {
      console.error('Invidious API fallback failed:', invidiousError);
    }
    
    // Last resort fallback
    return {
      title: 'YouTube Video',
      thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { videoUrl, startTime, endTime, momentId } = await request.json();
    
    console.log('Clip generation request received:', { videoUrl, startTime, endTime, momentId });
    
    if (!videoUrl || !startTime || !endTime || momentId === undefined) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Extract video ID from URL
    let videoId;
    try {
      videoId = ytdl.getVideoID(videoUrl);
    } catch (err) {
      console.error('Error extracting video ID:', err);
      
      // Try to extract ID manually if ytdl-core fails
      try {
        const urlObj = new URL(videoUrl);
        if (urlObj.hostname === 'youtu.be') {
          videoId = urlObj.pathname.substring(1);
        } else if (urlObj.hostname.includes('youtube.com')) {
          videoId = urlObj.searchParams.get('v') || '';
        }
        
        if (!videoId) {
          return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
        }
      } catch (urlErr) {
        return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
      }
    }

    if (!videoId) {
      return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
    }

    // Convert timestamps to seconds
    const startSeconds = timestampToSeconds(startTime);
    const endSeconds = timestampToSeconds(endTime);
    const duration = endSeconds - startSeconds;

    // Ensure the clip duration is reasonable
    if (duration <= 0 || duration > 60) {
      return NextResponse.json({ error: 'Invalid clip duration' }, { status: 400 });
    }

    console.log(`Processing clip from ${startTime} to ${endTime} (${duration}s)`);
    
    // Get direct and embed URLs
    const directUrl = createShareableYouTubeUrl(videoId, startSeconds);
    const embedUrl = createYouTubeEmbedUrl(videoId, startSeconds, endSeconds);
    
    // Try to fetch basic video info for title and thumbnail
    let videoTitle = '';
    let thumbnailUrl = '';
    
    // First attempt with enhanced ytdl-core retry mechanism
    const videoInfo = await getVideoInfoWithRetry(videoId);
    
    if (videoInfo) {
      videoTitle = videoInfo.videoDetails.title;
      thumbnailUrl = getBestThumbnailUrl(videoInfo);
      console.log('Successfully fetched video info:', { title: videoTitle });
    } else {
      console.error('Failed to fetch video info with enhanced retry');
      
      // Use backup method for basic info
      console.log('Attempting backup info retrieval...');
      const backupInfo = await getBackupVideoInfo(videoId);
      videoTitle = backupInfo.title;
      thumbnailUrl = backupInfo.thumbnailUrl;
      console.log('Retrieved backup info:', { title: videoTitle });
    }
    
    // Return YouTube embed info
    return NextResponse.json({
      success: true,
      clipUrl: embedUrl,
      directUrl: directUrl, 
      duration,
      videoId,
      videoTitle,
      thumbnailUrl,
      startSeconds,
      endSeconds,
      isMock: true,
      isEmbed: true,
      format: 'embed'
    });
    
  } catch (error: any) {
    console.error('API route error:', error);
    
    return NextResponse.json({ 
      error: 'Failed to generate clip',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}