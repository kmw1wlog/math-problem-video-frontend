import React from 'react';
import { Star, Eye, ThumbsUp } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';

interface Evaluation {
  id: string;
  rating: number;
  feedback: string;
  videoUrl: string;
  createdAt: string;
}

interface EvaluationTabProps {
  evaluations: Evaluation[];
  evaluationsLoading: boolean;
  evaluationStats: {
    totalEvaluations: number;
    averageRating: number;
    ratingDistribution: { '1': number, '2': number, '3': number, '4': number, '5': number };
  };
  selectedEvaluation: Evaluation | null;
  showEvaluationDialog: boolean;
  onViewEvaluation: (evaluation: Evaluation) => void;
  onCloseDialog: () => void;
  onRefresh: () => void;
  formatDate: (date: string) => string;
  truncateText: (text: string, maxLength?: number) => string;
}

export const EvaluationTab: React.FC<EvaluationTabProps> = ({
  evaluations,
  evaluationsLoading,
  evaluationStats,
  selectedEvaluation,
  showEvaluationDialog,
  onViewEvaluation,
  onCloseDialog,
  onRefresh,
  formatDate,
  truncateText
}) => {
  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'
        }`}
      />
    ));
  };

  const getRatingBadge = (rating: number) => {
    if (rating >= 4) {
      return <Badge className="bg-green-500/20 text-green-300">좋음</Badge>;
    } else if (rating >= 3) {
      return <Badge className="bg-yellow-500/20 text-yellow-300">보통</Badge>;
    } else {
      return <Badge className="bg-red-500/20 text-red-300">개선필요</Badge>;
    }
  };

  return (
    <>
      {/* Evaluation Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="border-orange-500/30 bg-card/50 backdrop-blur-lg">
          <div className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <ThumbsUp className="w-4 h-4 text-orange-400" />
              <span className="text-slate-300 text-sm">총 평가</span>
            </div>
            <p className="text-2xl font-bold text-white">{evaluationStats.totalEvaluations}</p>
          </div>
        </Card>
        
        <Card className="border-yellow-500/30 bg-card/50 backdrop-blur-lg">
          <div className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-400" />
              <span className="text-slate-300 text-sm">평균 별점</span>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-white">{evaluationStats.averageRating}</p>
              <div className="flex gap-1">
                {getRatingStars(Math.round(evaluationStats.averageRating))}
              </div>
            </div>
          </div>
        </Card>

        {/* Rating Distribution */}
        {[5, 4, 3, 2, 1].slice(0, 3).map((rating) => (
          <Card key={rating} className="border-slate-500/30 bg-card/50 backdrop-blur-lg">
            <div className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                <span className="text-slate-300 text-sm">{rating}점</span>
              </div>
              <p className="text-xl font-bold text-white">{evaluationStats.ratingDistribution[rating as keyof typeof evaluationStats.ratingDistribution]}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Evaluations Table */}
      <Card className="border-slate-600/30 bg-card/50 backdrop-blur-lg">
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-white">영상 평가 목록</h2>
            <Button
              onClick={onRefresh}
              size="sm"
              variant="outline"
              className="border-slate-600"
            >
              새로고침
            </Button>
          </div>

          {evaluationsLoading ? (
            <div className="text-center text-slate-400 py-8">
              데이터를 불러오는 중...
            </div>
          ) : evaluations.length === 0 ? (
            <div className="text-center text-slate-400 py-8">
              아직 평가가 없습니다.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-600">
                    <TableHead className="text-slate-300">별점</TableHead>
                    <TableHead className="text-slate-300">평가</TableHead>
                    <TableHead className="text-slate-300">의견</TableHead>
                    <TableHead className="text-slate-300">작성시간</TableHead>
                    <TableHead className="text-slate-300">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {evaluations.map((evaluation) => (
                    <TableRow key={evaluation.id} className="border-slate-700">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            {getRatingStars(evaluation.rating)}
                          </div>
                          <span className="text-slate-300 text-sm">({evaluation.rating})</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getRatingBadge(evaluation.rating)}
                      </TableCell>
                      <TableCell className="text-slate-300 max-w-xs">
                        {evaluation.feedback ? (
                          <button
                            onClick={() => onViewEvaluation(evaluation)}
                            className="text-left hover:text-blue-300 transition-colors"
                          >
                            {truncateText(evaluation.feedback, 30)}
                          </button>
                        ) : (
                          <span className="text-slate-500 italic">의견 없음</span>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-300 text-sm">
                        {formatDate(evaluation.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onViewEvaluation(evaluation)}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </Card>

      {/* Evaluation Detail Dialog */}
      <Dialog open={showEvaluationDialog} onOpenChange={onCloseDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>평가 상세보기</DialogTitle>
          </DialogHeader>
          {selectedEvaluation && (
            <div className="space-y-6">
              {/* Rating */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white">별점 평가</h3>
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    {getRatingStars(selectedEvaluation.rating)}
                  </div>
                  <span className="text-2xl font-bold text-white">{selectedEvaluation.rating}/5</span>
                  {getRatingBadge(selectedEvaluation.rating)}
                </div>
              </div>

              {/* Feedback */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white">개선 의견</h3>
                <div className="bg-slate-800/50 rounded-lg p-4">
                  {selectedEvaluation.feedback ? (
                    <p className="text-slate-300 leading-relaxed">
                      {selectedEvaluation.feedback}
                    </p>
                  ) : (
                    <p className="text-slate-500 italic">의견이 작성되지 않았습니다.</p>
                  )}
                </div>
              </div>

              {/* Video URL */}
              {selectedEvaluation.videoUrl && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-white">관련 영상</h3>
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <p className="text-slate-300 font-mono text-sm break-all">
                      {selectedEvaluation.videoUrl}
                    </p>
                  </div>
                </div>
              )}

              {/* Created At */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white">작성 시간</h3>
                <p className="text-slate-300">{formatDate(selectedEvaluation.createdAt)}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};