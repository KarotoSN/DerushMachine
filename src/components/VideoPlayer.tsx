import { useState, useEffect, useRef } from 'react';
import ReactPlayer from 'react-player';
import YouTube from 'react-youtube';

interface VideoPlayerProps {
  url: string;
  currentTime?: number;
  onReady?: () => void;
  isClip?: boolean;
  startTime?: number;
  endTime?: number;
}

// Extract YouTube video ID from URL
function extractYouTubeVideoId(url: string): string | null {
  // Handle YouTube embed URLs first
  if (url.includes('youtube.com/embed/')) {
    const embedMatch = url.match(/youtube\.com\/embed\/([^?&/]+)/);
    if (embedMatch && embedMatch[1]) return embedMatch[1];
  }
  
  try {
    // Try parsing as URL first for robust handling
    const urlObj = new URL(url);
    
    // Handle youtu.be URLs
    if (urlObj.hostname === 'youtu.be') {
      return urlObj.pathname.substring(1);
    }
    
    // Handle regular youtube.com URLs
    if (urlObj.hostname.includes('youtube.com')) {
      return urlObj.searchParams.get('v') || null;
    }
  } catch (e) {
    // If URL parsing fails, try regex as fallback
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
  }
  
  return null;
}

export default function VideoPlayer({ 
  url, 
  currentTime = 0, 
  onReady, 
  isClip = false,
  startTime,
  endTime
}: VideoPlayerProps) {
  const [isReady, setIsReady] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [useBackupPlayer, setUseBackupPlayer] = useState(false);
  const playerRef = useRef<ReactPlayer | null>(null);
  const youtubePlayerRef = useRef<any>(null);
  const videoId = extractYouTubeVideoId(url);
  
  // Detect if the URL is already a YouTube embed URL
  const isEmbedUrl = url.includes('youtube.com/embed/');
  
  // Use embed player by default for known embed URLs
  useEffect(() => {
    if (isEmbedUrl) {
      setUseBackupPlayer(true);
    }
  }, [isEmbedUrl]);

  // Handle seeking to currentTime when player is ready
  useEffect(() => {
    if (isReady && currentTime > 0) {
      if (!useBackupPlayer && playerRef.current) {
        playerRef.current.seekTo(currentTime);
      } else if (youtubePlayerRef.current?.internalPlayer) {
        youtubePlayerRef.current.internalPlayer.seekTo(currentTime);
      }
    }
  }, [currentTime, isReady, useBackupPlayer]);

  const handleReady = (event?: any) => {
    setIsReady(true);
    setPlayerError(null);
    
    // Store YouTube player reference if using backup player
    if (event && event.target) {
      youtubePlayerRef.current = event;
      
      // If currentTime is specified, seek to it
      if (currentTime > 0) {
        event.target.seekTo(currentTime);
      }
    }
    
    if (onReady) {
      onReady();
    }
  };

  const handleError = (error: any) => {
    console.error("Video player error:", error);
    
    // Determine specific error type
    let errorMessage = "Error playing video";
    if (typeof error === 'string' && error.includes('functions')) {
      errorMessage = "Error fetching video info: Could not extract functions";
    } else if (error && error.message) {
      errorMessage = error.message;
    }
    
    setPlayerError(errorMessage);
    setUseBackupPlayer(true);
  };

  // If the URL is already a direct YouTube embed, parse start/end times
  useEffect(() => {
    if (isEmbedUrl && !startTime && !endTime) {
      try {
        const urlObj = new URL(url);
        const start = urlObj.searchParams.get('start');
        const end = urlObj.searchParams.get('end');
        
        // Don't need to do anything with these values here,
        // they'll be passed to the YouTube embed automatically
      } catch (e) {
        console.error('Error parsing embed URL params:', e);
      }
    }
  }, [url, isEmbedUrl, startTime, endTime]);

  // If we're using the backup YouTube embed player
  if ((useBackupPlayer || isEmbedUrl) && videoId) {
    // Calculate start/end times for clip mode
    const clipStartSeconds = startTime || Math.round(currentTime);
    const clipEndSeconds = endTime || undefined;
    
    const opts = {
      height: '100%',
      width: '100%',
      playerVars: {
        autoplay: 0,
        start: clipStartSeconds,
        end: clipEndSeconds,
        origin: typeof window !== 'undefined' ? window.location.origin : '',
        rel: 0, // Don't show related videos
        modestbranding: 1 // Less YouTube branding
      } as any,
    };

    return (
      <div className="relative pt-[56.25%] w-full">
        <div className="absolute top-0 left-0 w-full h-full">
          {playerError && (
            <div className="mb-2 text-amber-500 text-sm">
              <div className="p-2 bg-amber-50 border border-amber-200 rounded">
                <p>Will continue with limited info using YouTube embed</p>
              </div>
            </div>
          )}
          <YouTube 
            videoId={videoId} 
            opts={opts} 
            onReady={handleReady}
            onError={(e) => console.warn('YouTube embed error:', e)}
            className="w-full h-full"
          />
        </div>
      </div>
    );
  }

  // Default to ReactPlayer
  return (
    <div className="relative pt-[56.25%] w-full">
      <ReactPlayer
        ref={playerRef}
        url={url}
        width="100%"
        height="100%"
        controls={true}
        playing={false}
        onReady={handleReady}
        onError={handleError}
        className="absolute top-0 left-0"
        fallback={
          <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-gray-100">
            <p>Loading video player...</p>
          </div>
        }
        config={{
          youtube: {
            playerVars: {
              start: Math.round(currentTime),
              origin: typeof window !== 'undefined' ? window.location.origin : ''
            }
          }
        }}
      />
      {playerError && (
        <div className="absolute top-2 left-0 right-0 mx-auto w-full px-4">
          <div className="p-2 bg-amber-50 border border-amber-200 rounded text-sm">
            {playerError}
            <p className="text-xs mt-1">Will continue with limited info using YouTube embed</p>
          </div>
        </div>
      )}
    </div>
  );
}