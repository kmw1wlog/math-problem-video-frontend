import React from 'react';
import { TabsContent } from './ui/tabs';
import { EvaluationTab } from './admin-panel-evaluations';

interface AdminPanelEvaluationsProps {
  evaluations: any[];
  evaluationsLoading: boolean;
  evaluationStats: any;
  selectedEvaluation: any;
  showEvaluationDialog: boolean;
  onViewEvaluation: (evaluation: any) => void;
  onCloseDialog: () => void;
  onRefresh: () => void;
  formatDate: (date: string) => string;
  truncateText: (text: string, maxLength?: number) => string;
}

export const AdminPanelEvaluations: React.FC<AdminPanelEvaluationsProps> = (props) => {
  return (
    <TabsContent value="evaluations" className="space-y-6">
      <EvaluationTab {...props} />
    </TabsContent>
  );
};