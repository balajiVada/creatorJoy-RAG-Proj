import React from 'react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 animate-fade-in relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px] -z-10 mix-blend-screen" />
      <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-purple-500/10 rounded-full blur-[120px] -z-10 mix-blend-screen" />

      <div className="max-w-2xl w-full text-center space-y-8 animate-slide-up">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white drop-shadow-sm">
            Compare Videos with <span className="text-primary bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-400">AI</span>
          </h1>
          <p className="text-lg text-foreground/80 max-w-xl mx-auto">
            Paste a YouTube URL and an Instagram Reel URL to instantly analyze engagement, hooks, and uncover why one outperformed the other.
          </p>
        </div>
        
        <Card className="max-w-md mx-auto space-y-5 text-left border-white/5 bg-black/40">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground/90 ml-1">YouTube Video (Video A)</label>
            <Input placeholder="https://youtube.com/watch?v=..." />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground/90 ml-1">Instagram Reel (Video B)</label>
            <Input placeholder="https://instagram.com/reel/..." />
          </div>
          <Button className="w-full mt-6 text-lg py-3 shadow-lg shadow-primary/20">Analyze Videos</Button>
        </Card>
      </div>
    </div>
  );
};
