import React from 'react';
import { AlertCircle, AlertTriangle, Globe, RefreshCcw } from 'lucide-react';

export interface ErrorCardProps {
  url: string;
  error: string;
  onRetry?: () => void;
}

export const ErrorCard: React.FC<ErrorCardProps> = ({
  url,
  error,
  onRetry
}) => {
  return (
    <div className="flex flex-col sm:flex-row rounded-xl border border-error/20 bg-error/5 overflow-hidden w-full max-w-2xl font-sans hover:shadow-sm transition-all duration-300">
      {/* Icon Side Area */}
      <div className="w-full sm:w-16 bg-error/10 flex items-center justify-center p-4 sm:p-0 shrink-0">
        <AlertTriangle className="text-error animate-pulse" size={28} />
      </div>

      {/* Content Area */}
      <div className="p-5 flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.25px] bg-error text-white px-2 py-0.5 rounded-xs">
              Ingestion Error
            </span>
            <span className="text-[11px] text-muted truncate max-w-[200px] flex items-center gap-1 font-mono">
              <Globe size={10} />
              {url}
            </span>
          </div>

          <h3 className="font-semibold text-[15px] text-ink leading-snug">
            Failed to process the requested video source
          </h3>

          <p className="text-[13px] text-error/90 mt-2 font-medium bg-error/[0.03] border border-error/10 p-2.5 rounded-md break-words font-mono">
            {error || 'An unknown error occurred during video ingestion.'}
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-error/10 flex flex-wrap items-center justify-between gap-3 text-[12px]">
          <span className="text-muted">
            Please check the URL or try again later.
          </span>
          {onRetry && (
            <button 
              onClick={onRetry}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-border-light hover:border-primary text-ink hover:shadow-xs transition-all font-semibold"
            >
              <RefreshCcw size={12} />
              Retry Ingestion
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
