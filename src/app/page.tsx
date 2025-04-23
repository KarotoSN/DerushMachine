'use client';

import { useState, useRef } from 'react';
import YouTubeInput from '@/components/YouTubeInput';
import VideoPlayer from '@/components/VideoPlayer';
import FunnyMomentsList, { FunnyMoment } from '@/components/FunnyMomentsList';
import CustomMomentFinder from '@/components/CustomMomentFinder';
import ClipPreview from '@/components/ClipPreview';

export default function Home() {
  const [youtubeUrl, setYoutubeUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [funnyMoments, setFunnyMoments] = useState<FunnyMoment[]>([]);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isVideoLoaded, setIsVideoLoaded] = useState<boolean>(false);
  const [previewMoment, setPreviewMoment] = useState<FunnyMoment | null>(null);

  const handleAnalyze = async (url: string) => {
    setYoutubeUrl(url);
    setIsLoading(true);
    setError(null);
    setFunnyMoments([]);
    setIsVideoLoaded(false);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error('Échec de l\'analyse de la vidéo');
      }

      const data = await response.json();
      
      if (data.funniest_moments_list && Array.isArray(data.funniest_moments_list)) {
        setFunnyMoments(data.funniest_moments_list);
      } else {
        setError('Aucun moment drôle n\'a été trouvé dans cette vidéo');
      }
    } catch (err) {
      setError('Erreur lors de l\'analyse de la vidéo. Vérifiez votre clé API et réessayez.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectMoment = (startTime: number) => {
    setCurrentTime(startTime);
  };

  const handleMomentFound = (moment: FunnyMoment) => {
    // Add to the top of the list for better visibility
    setFunnyMoments(prevMoments => [moment, ...prevMoments]);
    
    // Convert time to seconds and jump to it
    const parts = moment.timestamp_start.split(':').map(Number);
    let startTimeSeconds = 0;
    if (parts.length === 3) {
      startTimeSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      startTimeSeconds = parts[0] * 60 + parts[1];
    }
    
    setCurrentTime(startTimeSeconds);
    
    // Automatically open the clip preview for the custom moment
    setPreviewMoment(moment);
  };

  const handleVideoReady = () => {
    setIsVideoLoaded(true);
  };

  const handleClosePreview = () => {
    setPreviewMoment(null);
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-6 md:p-8 bg-gradient-to-b from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-5xl">
        <h1 className="text-3xl font-bold text-center mb-8 dark:text-white">
          Détecteur de Moments Drôles pour TikTok
        </h1>
        
        <YouTubeInput onAnalyze={handleAnalyze} isLoading={isLoading} />
        
        {error && (
          <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-md border border-red-300 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
            {error}
          </div>
        )}

        {youtubeUrl && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4 dark:text-white">Aperçu de la vidéo</h2>
            <VideoPlayer 
              url={youtubeUrl} 
              currentTime={currentTime} 
              onReady={handleVideoReady}
            />
          </div>
        )}

        {youtubeUrl && isVideoLoaded && (
          <CustomMomentFinder 
            videoUrl={youtubeUrl} 
            onMomentFound={handleMomentFound} 
            isVideoLoaded={isVideoLoaded}
          />
        )}

        {funnyMoments.length > 0 && (
          <FunnyMomentsList 
            moments={funnyMoments} 
            onSelectMoment={handleSelectMoment}
            videoUrl={youtubeUrl}
          />
        )}

        {isLoading && (
          <div className="mt-8 flex justify-center items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <p className="ml-3 text-lg text-gray-600 dark:text-gray-400">Analyse de la vidéo pour trouver des moments drôles...</p>
          </div>
        )}

        {previewMoment && youtubeUrl && (
          <ClipPreview
            moment={previewMoment}
            videoUrl={youtubeUrl}
            onClose={handleClosePreview}
          />
        )}

        <div className="mt-12 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>Cette application utilise l'IA Gemini pour analyser les vidéos YouTube et trouver des moments drôles adaptés à TikTok.</p>
        </div>
      </div>
    </main>
  );
}
