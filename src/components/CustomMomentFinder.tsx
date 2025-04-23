import { useState } from 'react';
import { FunnyMoment } from './FunnyMomentsList';

interface CustomMomentFinderProps {
  videoUrl: string;
  onMomentFound: (moment: FunnyMoment) => void;
  isVideoLoaded: boolean;
}

export default function CustomMomentFinder({ 
  videoUrl, 
  onMomentFound,
  isVideoLoaded
}: CustomMomentFinderProps) {
  const [instruction, setInstruction] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!instruction.trim()) {
      setError('Veuillez fournir une description du moment que vous souhaitez trouver.');
      return;
    }

    if (!videoUrl) {
      setError('Veuillez d\'abord entrer une URL YouTube.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/find-custom-moment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          videoUrl,
          instruction 
        }),
      });

      if (!response.ok) {
        throw new Error('Impossible de trouver le moment');
      }

      const moment = await response.json();
      onMomentFound(moment);
      setInstruction('');
    } catch (err) {
      console.error('Erreur lors de la recherche du moment personnalisé:', err);
      setError('Impossible de trouver le moment. Veuillez essayer une description différente.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isVideoLoaded) {
    return null;
  }

  return (
    <div className="mt-8 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h3 className="text-xl font-semibold mb-4 dark:text-white">Trouver un moment spécifique</h3>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="instruction" className="block text-sm font-medium mb-1 dark:text-white">
            Décrivez ce que vous recherchez :
          </label>
          <textarea
            id="instruction"
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="Exemple : 'Trouver le moment où le chien saute dans la piscine' ou 'Trouver un moment avec une réaction faciale drôle vers 5:30'"
            rows={3}
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            disabled={isLoading}
          />
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Soyez aussi précis que possible avec ce que vous voulez trouver, et incluez des indices de timestamp si vous les connaissez.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !instruction.trim()}
          className="px-4 py-2 bg-teal-500 text-white rounded-md hover:bg-teal-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
        >
          {isLoading ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
              Recherche en cours...
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Trouver et créer un clip
            </>
          )}
        </button>
      </form>
    </div>
  );
}