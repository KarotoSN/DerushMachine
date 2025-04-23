import { useState, useEffect, useRef } from 'react';
import ReactPlayer from 'react-player';
import { FunnyMoment } from './FunnyMomentsList';

interface ClipPreviewProps {
  moment: FunnyMoment;
  videoUrl: string;
  onClose: () => void;
}

interface ClipResponse {
  success: boolean;
  clipUrl: string;
  embedUrl?: string;
  directUrl?: string;
  duration: number;
  videoId?: string;
  videoTitle?: string;
  thumbnailUrl?: string;
  startSeconds?: number;
  endSeconds?: number;
  isMock?: boolean;
  isEmbed?: boolean;
  format?: 'mp4' | 'embed';
  error?: string;
}

export default function ClipPreview({ moment, videoUrl, onClose }: ClipPreviewProps) {
  const [loading, setLoading] = useState(false);
  const [clipUrl, setClipUrl] = useState<string | null>(null);
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [directUrl, setDirectUrl] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMock, setIsMock] = useState(false);
  const [isEmbed, setIsEmbed] = useState(false);
  const [format, setFormat] = useState<'mp4' | 'embed' | null>(null);
  const [generationProgress, setGenerationProgress] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const retryCount = useRef(0);
  const maxRetries = 2;
  const generationStartTime = useRef(Date.now());
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Parse timestamp strings to seconds for ReactPlayer
  const parseTimestamp = (timestamp: string): number => {
    const parts = timestamp.split(':').map(Number);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return 0;
  };

  const startTime = parseTimestamp(moment.timestamp_start);
  const endTime = parseTimestamp(moment.timestamp_end);
  
  // Function to generate YouTube embed URL with timestamp
  const getYouTubeEmbedUrl = (): string => {
    try {
      // Extract video ID
      const videoId = extractYouTubeID(videoUrl);
      if (!videoId) return '';
      
      // Return embed URL with start time and end time
      return `https://www.youtube.com/embed/${videoId}?start=${startTime}&end=${endTime}&autoplay=1`;
    } catch (e) {
      console.error('Erreur lors de la création de l\'URL YouTube embed:', e);
      return '';
    }
  };

  const extractYouTubeID = (url: string): string | null => {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
  };

  // Check if URL is a local MP4 file
  const isLocalMp4 = (url: string): boolean => {
    return url && url.startsWith('/clips/') && url.endsWith('.mp4');
  };

  // Simulate progress during clip generation
  useEffect(() => {
    let progressInterval: NodeJS.Timeout | null = null;

    if (loading) {
      generationStartTime.current = Date.now();
      
      // Update progress every second
      progressInterval = setInterval(() => {
        const elapsed = (Date.now() - generationStartTime.current) / 1000;
        const estimatedProgress = Math.min(90, (elapsed / (moment.duration_seconds * 1.5)) * 100);
        setGenerationProgress(Math.round(estimatedProgress));
      }, 1000);
    } else {
      setGenerationProgress(100);
    }

    return () => {
      if (progressInterval) clearInterval(progressInterval);
    };
  }, [loading, moment.duration_seconds]);

  // Generate clip when component mounts
  useEffect(() => {
    const generateClip = async () => {
      setLoading(true);
      setError(null);
      setIsMock(false);
      setIsEmbed(false);
      setFormat(null);
      setCopied(false);
      
      try {
        console.log('Demande de génération de clip pour le moment:', moment.moment_id);
        const response = await fetch('/api/generate-clip', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            videoUrl,
            startTime: moment.timestamp_start,
            endTime: moment.timestamp_end,
            momentId: moment.moment_id,
          }),
          signal: AbortSignal.timeout(60000) // 60s timeout
        });

        const data: ClipResponse = await response.json();
        console.log('Réponse de la génération de clip:', data);
        
        if (!response.ok) {
          throw new Error(data.error || 'Échec de la génération du clip');
        }

        if (data.success) {
          setClipUrl(data.clipUrl);
          
          if (data.embedUrl) {
            setEmbedUrl(data.embedUrl);
          }
          
          if (data.directUrl) {
            setDirectUrl(data.directUrl);
          }
          
          if (data.thumbnailUrl) {
            setThumbnailUrl(data.thumbnailUrl);
          }
          
          if (data.videoTitle) {
            setVideoTitle(data.videoTitle);
          }
          
          if (data.format) {
            setFormat(data.format);
          }
          
          if (data.isMock) {
            setIsMock(true);
            
            if (data.isEmbed) {
              setIsEmbed(true);
              console.log('Utilisation de YouTube embed pour l\'aperçu');
            }
          } else {
            console.log('Clip MP4 réel créé:', data.clipUrl);
            
            // Prefetch the video to ensure it's loaded
            if (isLocalMp4(data.clipUrl)) {
              const video = document.createElement('video');
              video.preload = 'auto';
              video.src = data.clipUrl;
              video.onloadeddata = () => {
                console.log('Clip MP4 préchargé avec succès');
              };
              video.onerror = (e) => {
                console.error('Erreur lors du préchargement du clip MP4:', e);
                
                // If we can't preload the MP4, switch to fallback
                if (data.embedUrl) {
                  console.log('Passage à la solution de secours embed URL');
                  setClipUrl(data.embedUrl);
                  setIsEmbed(true);
                  setIsMock(true);
                  setFormat('embed');
                }
              };
            }
          }
        } else {
          throw new Error(data.error || 'Une erreur est survenue lors de la génération du clip');
        }
      } catch (err: any) {
        console.error('Erreur lors de la génération du clip:', err);
        
        // If we haven't exceeded max retries, try YouTube embed as fallback
        if (retryCount.current < maxRetries) {
          retryCount.current++;
          console.log(`Tentative ${retryCount.current} sur ${maxRetries}`);
          
          // Use YouTube embed URL as fallback
          const youtubeEmbed = getYouTubeEmbedUrl();
          if (youtubeEmbed) {
            setClipUrl(youtubeEmbed);
            setIsMock(true);
            setIsEmbed(true);
            setFormat('embed');
            setError(`Utilisation de l'aperçu YouTube à la place (${err.message})`);
          } else {
            setError(`Échec de la génération du clip : ${err.message}`);
          }
        } else {
          setError(`Échec de la génération du clip après plusieurs tentatives : ${err.message}`);
        }
      } finally {
        setLoading(false);
      }
    };

    generateClip();
  }, [videoUrl, moment]);

  // Download clip or open YouTube with timestamp
  const handleDownload = () => {
    // For direct YouTube links or embeds
    if (isMock && directUrl) {
      window.open(directUrl, '_blank');
      return;
    }
    
    // For local MP4 files
    if (clipUrl && isLocalMp4(clipUrl)) {
      console.log('Téléchargement du clip MP4 local:', clipUrl);
      
      // Create a dynamic download name based on the video and moment
      const videoId = extractYouTubeID(videoUrl) || 'clip';
      const downloadName = `tiktok-${videoId}-${moment.moment_id}.mp4`;
      
      const link = document.createElement('a');
      link.href = clipUrl;
      link.download = downloadName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('Téléchargement initié pour', downloadName);
    }
  };

  // Copy TikTok description with caption and source to clipboard
  const handleCopyTikTokDescription = () => {
    // Create a description that includes the caption and a source reference
    const description = `${moment.suggested_caption_hook}\n\n` + 
      `${videoTitle ? `Source : ${videoTitle}\n` : ''}` +
      `#momentsdrôles #viral #tendance`;
    
    navigator.clipboard.writeText(description).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      console.error('Échec de la copie du texte:', err);
    });
  };

  // Render different video players based on content type
  const renderVideoPlayer = () => {
    if (!clipUrl) return null;
    
    // For local MP4 files, use the native video element
    if (isLocalMp4(clipUrl)) {
      return (
        <video 
          ref={videoRef}
          controls
          autoPlay
          className="absolute top-0 left-0 w-full h-full"
          onError={(e) => {
            console.error('Erreur lors de la lecture MP4:', e);
            // If MP4 playback fails and we have an embed URL, use it
            if (embedUrl) {
              setClipUrl(embedUrl);
              setIsEmbed(true);
              setIsMock(true);
              setFormat('embed');
            } else {
              setError('Erreur lors de la lecture du clip généré. Veuillez essayer l\'option YouTube.');
            }
          }}
        >
          <source src={clipUrl} type="video/mp4" />
          Votre navigateur ne prend pas en charge la balise vidéo.
        </video>
      );
    }
    
    // For YouTube embeds or other URLs, use ReactPlayer
    return (
      <ReactPlayer
        url={clipUrl}
        width="100%"
        height="100%"
        controls={true}
        playing={true}
        className="absolute top-0 left-0"
        config={{
          youtube: {
            playerVars: {
              start: startTime,
              end: endTime,
              autoplay: 1
            }
          }
        }}
        onError={(e) => {
          console.error('Erreur ReactPlayer:', e);
          setError('Erreur lors de la lecture du clip. Veuillez essayer l\'option YouTube.');
        }}
      />
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full p-4 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg dark:text-white">
            {moment.description}
            {videoTitle && <span className="ml-2 font-normal text-sm text-gray-500">de {videoTitle}</span>}
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center p-8">
            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mb-4">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${generationProgress}%` }}
              ></div>
            </div>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              Génération de l'aperçu du clip... {generationProgress}%
            </p>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
              Cela peut prendre un moment selon la longueur et la qualité de la vidéo.
            </p>
          </div>
        ) : error ? (
          <div>
            <div className="p-4 mb-4 bg-yellow-100 text-yellow-700 rounded-md dark:bg-yellow-900/20 dark:text-yellow-400">
              {error}
            </div>
            {clipUrl && (
              <div className="relative pt-[56.25%]">
                {renderVideoPlayer()}
              </div>
            )}
          </div>
        ) : clipUrl ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <div className="relative pt-[56.25%]">
                {renderVideoPlayer()}
              </div>
              
              {isMock && (
                <div className="mt-2 p-2 bg-blue-100 text-blue-800 text-sm rounded-md dark:bg-blue-900/20 dark:text-blue-300">
                  {isEmbed 
                    ? "Utilisation du lecteur YouTube. Pour le contenu TikTok, vous pouvez utiliser le lien 'Voir sur YouTube' et enregistrer l'écran durant ce segment."
                    : "Ceci est un aperçu. Pour le clip en qualité complète, utilisez le bouton de téléchargement ci-dessous."}
                </div>
              )}
            </div>
            
            <div className="md:col-span-1 flex flex-col">
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 mb-4">
                <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Détails TikTok</h4>
                <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                  Durée : {moment.duration_seconds}s ({moment.timestamp_start} - {moment.timestamp_end})
                </div>
                
                <h5 className="font-medium text-gray-700 dark:text-gray-300 mt-3">Légende suggérée :</h5>
                <p className="text-gray-600 dark:text-gray-400 italic mb-3 text-sm border-l-2 border-gray-300 dark:border-gray-600 pl-2">
                  {moment.suggested_caption_hook}
                </p>
                
                <h5 className="font-medium text-gray-700 dark:text-gray-300">Pourquoi c'est bon pour TikTok :</h5>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                  {moment.why_its_tiktok_funny}
                </p>
                
                <button
                  onClick={handleCopyTikTokDescription}
                  className={`w-full px-3 py-2 mb-3 text-sm ${
                    copied 
                      ? 'bg-green-500 text-white' 
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-gray-200'
                  } rounded-md flex items-center justify-center transition-colors`}
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  {copied ? 'Copié !' : 'Copier la légende TikTok'}
                </button>
                
                <button
                  onClick={handleDownload}
                  className="w-full px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md flex items-center justify-center"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isMock ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    )}
                  </svg>
                  {isMock ? 'Voir sur YouTube' : 'Télécharger pour TikTok'}
                </button>
              </div>
              
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-auto">
                <p>Astuce : Si le téléchargement direct du clip ne fonctionne pas, vous pouvez utiliser un logiciel d'enregistrement d'écran pour capturer le moment drôle depuis l'aperçu YouTube.</p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}