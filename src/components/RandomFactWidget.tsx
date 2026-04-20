import React, { useState, useEffect } from 'react';
import { Lightbulb, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function RandomFactWidget() {
  const [fact, setFact] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchFact = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://uselessfacts.jsph.pl/api/v2/facts/random?language=en', {
        headers: { Accept: 'application/json' },
      });
      const data = await response.json();
      setFact(data.text);
    } catch (error) {
      console.error('Failed to fetch fact', error);
      // fallback fact if fails
      setFact('A group of flamingos is called a flamboyance.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFact();
  }, []);

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-start sm:items-center gap-3 shadow-sm relative overflow-hidden group transition-all"
      >
        <div className="bg-indigo-100 p-2 rounded-full text-indigo-600 shrink-0 mt-0.5 sm:mt-0">
          <Lightbulb className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0 pr-8">
          <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-0.5 flex items-center gap-2">
            Fun Fact Break
          </h4>
          <p className="text-sm text-indigo-800 leading-snug min-h-[1.25rem]">
            {loading && !fact ? (
              <span className="animate-pulse bg-indigo-200/50 h-4 w-2/3 block rounded"></span>
            ) : (
              fact
            )}
          </p>
        </div>
        <button 
          onClick={fetchFact} 
          disabled={loading}
          className="absolute right-4 top-4 sm:top-1/2 sm:-translate-y-1/2 p-2 text-indigo-400 hover:text-indigo-700 hover:bg-indigo-200/50 rounded-full transition-colors disabled:opacity-50"
          title="Get another fact"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
