import { useState } from 'react';
import ClipPreview from './ClipPreview';

export interface FunnyMoment {
  moment_id: number;
  description: string;
  timestamp_start: string;
  timestamp_end: string;
  duration_seconds: number;
  why_its_tiktok_funny: string;
  suggested_caption_hook: string;
}

interface FunnyMomentsListProps {
  moments: FunnyMoment[];
  onSelectMoment: (startTime: number) => void;
  videoUrl?: string;
}

export default function FunnyMomentsList({ 
  moments, 
  onSelectMoment,
  videoUrl 
}: FunnyMomentsListProps) {
  const [selectedMomentId, setSelectedMomentId] = useState<number | null>(null);
  const [previewMoment, setPreviewMoment] = useState<FunnyMoment | null>(null);

  const handleSelectMoment = (moment: FunnyMoment) => {
    setSelectedMomentId(moment.moment_id);
    // Convert timestamp to seconds
    const startTimeStr = moment.timestamp_start;
    const [hours, minutes, seconds] = startTimeStr.split(':').map(Number);
    const startTimeSeconds = hours * 3600 + minutes * 60 + seconds;
    onSelectMoment(startTimeSeconds);
  };

  const handlePreviewClip = (moment: FunnyMoment) => {
    setPreviewMoment(moment);
  };

  const handleClosePreview = () => {
    setPreviewMoment(null);
  };

  if (!moments || moments.length === 0) {
    return <div className="p-4 text-center text-gray-500">Aucun moment drôle trouvé pour l'instant.</div>;
  }

  return (
    <div className="mt-6">
      <h3 className="text-xl font-semibold mb-4 dark:text-white">Moments Drôles</h3>
      <div className="space-y-4">
        {moments.map((moment) => (
          <div 
            key={moment.moment_id}
            className={`p-4 rounded-lg transition-all ${
              selectedMomentId === moment.moment_id 
                ? 'bg-blue-100 border-l-4 border-blue-500 dark:bg-blue-900/20 dark:border-blue-400' 
                : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700'
            }`}
          >
            <div className="flex justify-between items-center">
              <h4 className="font-medium text-lg dark:text-white">{moment.description}</h4>
              <span className="text-sm bg-gray-200 text-gray-700 px-2 py-1 rounded-full dark:bg-gray-700 dark:text-gray-300">
                {moment.timestamp_start} - {moment.timestamp_end} ({moment.duration_seconds}s)
              </span>
            </div>
            
            <p className="text-sm text-gray-600 mt-2 dark:text-gray-300">
              <span className="font-medium">Pourquoi c'est parfait pour TikTok :</span> {moment.why_its_tiktok_funny}
            </p>
            
            <p className="text-sm text-gray-600 mt-1 italic dark:text-gray-300">
              <span className="font-medium">Idée de légende :</span> "{moment.suggested_caption_hook}"
            </p>
            
            <div className="mt-3 flex gap-2 flex-wrap">
              <button
                onClick={() => handleSelectMoment(moment)}
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Regarder ce moment
              </button>
              
              {videoUrl && (
                <button
                  onClick={() => handlePreviewClip(moment)}
                  className="px-3 py-1 text-sm bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors flex items-center"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Aperçu du clip
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {previewMoment && videoUrl && (
        <ClipPreview
          moment={previewMoment}
          videoUrl={videoUrl}
          onClose={handleClosePreview}
        />
      )}
    </div>
  );
}