import React from 'react';
import { useParams } from 'react-router-dom';

export const ComparisonView: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 animate-fade-in relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px] -z-10 mix-blend-screen" />
      <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-purple-500/10 rounded-full blur-[120px] -z-10 mix-blend-screen" />

      <div className="max-w-4xl w-full text-center space-y-8 animate-slide-up">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white drop-shadow-sm">
          Comparison Session Initialization
        </h1>
        <div className="glass-panel p-8 rounded-xl shadow-xl inline-block text-left">
          <p className="text-foreground/80 mb-4">Session ID: <span className="font-mono text-primary">{id}</span></p>
          <div className="flex items-center gap-3 text-primary">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span>Ready for Phase 3: Extraction Services...</span>
          </div>
        </div>
      </div>
    </div>
  );
};
