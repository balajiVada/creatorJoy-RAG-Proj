import { create } from 'zustand';

export interface PipelineStep {
  step: string;
  status: 'pending' | 'completed' | 'failed';
  timestamp: number;
  durationMs?: number;
  [key: string]: any;
}

interface PipelineInspectorState {
  runId: string | null;
  steps: PipelineStep[];
  isExpanded: boolean;
  expandedSteps: Record<string, boolean>;
  addStep: (runId: string, step: PipelineStep) => void;
  resetRun: (runId: string) => void;
  toggleExpanded: () => void;
  toggleStepExpanded: (stepName: string) => void;
}

export const usePipelineInspectorStore = create<PipelineInspectorState>((set) => ({
  runId: null,
  steps: [],
  isExpanded: true,
  expandedSteps: {},

  addStep: (runId, step) =>
    set((state) => {
      // If we receive a step for a new runId, and we haven't explicitly reset, we might want to auto-reset.
      // But we handle explicit reset in handleSend usually.
      // We will only accept steps for the current runId, or if runId is null, we set it.
      if (state.runId && state.runId !== runId) {
        return { runId, steps: [step], expandedSteps: {} };
      }
      return {
        runId,
        steps: [...state.steps, step],
      };
    }),

  resetRun: (runId) => set({ runId, steps: [], expandedSteps: {} }),
  
  toggleExpanded: () => set((state) => ({ isExpanded: !state.isExpanded })),
  
  toggleStepExpanded: (stepName) => 
    set((state) => ({
      expandedSteps: {
        ...state.expandedSteps,
        [stepName]: !state.expandedSteps[stepName]
      }
    })),
}));
