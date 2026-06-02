import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getSession, extractSession } from '../lib/api';
import { Loader2, MonitorPlay, Smartphone, MessageSquare, Heart, Eye, Activity } from 'lucide-react';
import { Card } from '../components/ui/Card';

export const ComparisonView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<any>(null);
  const [isExtracting, setIsExtracting] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initSession = async () => {
      try {
        if (!id) return;
        // Check if already extracted
        const currentSession = await getSession(id);
        
        if (currentSession.videoAId?.extractionStatus === 'success' && currentSession.videoBId?.extractionStatus === 'success') {
          setSession(currentSession);
          setIsExtracting(false);
          return;
        }

        // Trigger extraction
        const updatedSession = await extractSession(id);
        setSession(updatedSession);
      } catch (err: any) {
        setError(err.message || 'Failed to extract video data');
      } finally {
        setIsExtracting(false);
      }
    };
    initSession();
  }, [id]);

  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-red-400 p-8 text-center">{error}</div>;
  }

  if (isExtracting || !session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <h2 className="text-xl font-medium text-white">Extracting Data & Transcripts...</h2>
        <p className="text-foreground/60 mt-2">This may take a moment</p>
      </div>
    );
  }

  const { videoAId: videoA, videoBId: videoB } = session;

  const MetricRow = ({ icon: Icon, label, value }: { icon: any, label: string, value: any }) => (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      <div className="flex items-center gap-2 text-foreground/80">
        <Icon className="w-4 h-4" />
        <span className="text-sm">{label}</span>
      </div>
      <span className="font-semibold text-white">{value?.toLocaleString() || 'N/A'}</span>
    </div>
  );

  return (
    <div className="min-h-screen p-4 md:p-8 animate-fade-in relative overflow-hidden">
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[100px] -z-10 mix-blend-screen" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] -z-10 mix-blend-screen" />
      
      <div className="max-w-6xl mx-auto space-y-8 animate-slide-up">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-white">Comparison Dashboard</h1>
          <p className="text-foreground/60 font-mono text-sm">Session: {id}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* YouTube Card */}
          <Card className="border-red-500/20 bg-black/40 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />
            <div className="flex items-center gap-3 mb-6">
              <MonitorPlay className="w-8 h-8 text-red-500" />
              <h2 className="text-2xl font-bold text-white">YouTube</h2>
            </div>
            
            <div className="space-y-6">
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <MetricRow icon={Activity} label="Engagement Rate" value={`${videoA.engagementRate}%`} />
                <MetricRow icon={Eye} label="Views" value={videoA.views} />
                <MetricRow icon={Heart} label="Likes" value={videoA.likes} />
                <MetricRow icon={MessageSquare} label="Comments" value={videoA.comments} />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-primary mb-2 uppercase tracking-wider">Transcript Snippet</h3>
                <p className="text-sm text-foreground/70 line-clamp-5 leading-relaxed bg-black/30 p-4 rounded-md border border-white/5">
                  {videoA.transcript || "No transcript available."}
                </p>
              </div>
            </div>
          </Card>

          {/* Instagram Card */}
          <Card className="border-pink-500/20 bg-black/40 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 to-purple-500" />
            <div className="flex items-center gap-3 mb-6">
              <Smartphone className="w-8 h-8 text-pink-500" />
              <h2 className="text-2xl font-bold text-white">Instagram Reel</h2>
            </div>
            
            <div className="space-y-6">
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <MetricRow icon={Activity} label="Engagement Rate" value={`${videoB.engagementRate}%`} />
                <MetricRow icon={Eye} label="Views" value={videoB.views} />
                <MetricRow icon={Heart} label="Likes" value={videoB.likes} />
                <MetricRow icon={MessageSquare} label="Comments" value={videoB.comments} />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-primary mb-2 uppercase tracking-wider">Transcript Snippet</h3>
                <p className="text-sm text-foreground/70 line-clamp-5 leading-relaxed bg-black/30 p-4 rounded-md border border-white/5">
                  {videoB.transcript || "No transcript available."}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
