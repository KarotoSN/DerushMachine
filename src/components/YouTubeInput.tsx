import { useState, useEffect } from 'react';

interface YouTubeInputProps {
  onAnalyze: (url: string) => void;
  isLoading: boolean;
  error?: string;
}

export default function YouTubeInput({ onAnalyze, isLoading, error }: YouTubeInputProps) {
  const [url, setUrl] = useState<string>('');
  const [urlError, setUrlError] = useState<string>('');
  const [lastAnalyzedUrl, setLastAnalyzedUrl] = useState<string>('');

  // Validate YouTube URL format
  const validateUrl = (input: string): boolean => {
    // Reset error state
    setUrlError('');
    
    if (!input.trim()) return false;
    
    try {
      // Try to parse as URL first
      const urlObj = new URL(input);
      
      // Check if it's a YouTube domain
      const isYouTubeDomain = 
        urlObj.hostname === 'youtu.be' || 
        urlObj.hostname === 'youtube.com' || 
        urlObj.hostname === 'www.youtube.com' ||
        urlObj.hostname.endsWith('.youtube.com');
        
      if (!isYouTubeDomain) {
        setUrlError('Veuillez entrer une URL YouTube valide');
        return false;
      }
      
      // For youtube.com domain, ensure it has a video ID
      if (urlObj.hostname !== 'youtu.be' && !urlObj.searchParams.get('v')) {
        setUrlError('Impossible de trouver l\'ID de la vidéo dans l\'URL YouTube');
        return false;
      }
      
      return true;
    } catch (e) {
      setUrlError('Veuillez entrer une URL valide');
      return false;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateUrl(url)) {
      setLastAnalyzedUrl(url);
      onAnalyze(url);
    }
  };

  // Clear error message when URL changes
  useEffect(() => {
    if (url !== lastAnalyzedUrl) {
      setUrlError('');
    }
  }, [url, lastAnalyzedUrl]);

  // If a new URL is validly submitted, clear the input box when complete
  useEffect(() => {
    if (!isLoading && lastAnalyzedUrl && !error) {
      // Keep URL visible so user knows which video was analyzed
      // setUrl('');
    }
  }, [isLoading, lastAnalyzedUrl, error]);

  return (
    <div className="w-full max-w-3xl mx-auto p-4 bg-white rounded-lg shadow-md dark:bg-gray-800">
      <h2 className="text-xl font-semibold mb-4 text-center dark:text-white">
        Entrez l'URL YouTube pour trouver des moments drôles
      </h2>
      <form onSubmit={handleSubmit} className="flex flex-col space-y-3">
        <div className="flex flex-col md:flex-row gap-2">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Collez l'URL YouTube ici (ex: https://www.youtube.com/watch?v=dQw4w9WgXcQ)"
            className={`flex-grow px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
              urlError || error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            }`}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !url.trim()}
            className={`px-6 py-2 rounded-md text-white font-medium 
              ${isLoading || !url.trim() 
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
              }`}
          >
            {isLoading ? 'Analyse en cours...' : 'Trouver des moments drôles'}
          </button>
        </div>
        
        {/* Error message display */}
        {(urlError || error) && (
          <div className="text-red-500 text-sm">
            {urlError || (error && (
              <>
                <span>Erreur : {error}</span>
                <span className="block mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Ne vous inquiétez pas ! Nous allons quand même essayer d'analyser en utilisant notre solution de secours.
                </span>
              </>
            ))}
          </div>
        )}
        
        {/* Examples section */}
        <div className="text-xs text-gray-500 dark:text-gray-400 pt-2">
          <p>Exemples :</p>
          <ul className="list-disc list-inside pl-2 space-y-1">
            <li>Standard : https://www.youtube.com/watch?v=dQw4w9WgXcQ</li>
            <li>Raccourci : https://youtu.be/dQw4w9WgXcQ</li>
          </ul>
        </div>
      </form>
    </div>
  );
}