import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, Star, Download, Share2 } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface ResultAnalysisSectionProps {
  problemId: string;
  videoUrl: string;
  onStartNew: () => void;
}

export const ResultAnalysisSection: React.FC<ResultAnalysisSectionProps> = ({ 
  problemId, 
  videoUrl, 
  onStartNew 
}) => {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [hoveredStar, setHoveredStar] = useState(0);
  const [evaluationSubmitted, setEvaluationSubmitted] = useState(false);


  const handleStarClick = useCallback((starNumber: number) => {
    setRating(starNumber);
  }, []);

  const handleSubmitEvaluation = useCallback(async () => {
    if (rating === 0) {
      toast.error('별점을 선택해주세요!');
      return;
    }

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3a80e39f/evaluations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          rating,
          feedback: feedback.trim(),
          videoUrl,
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        toast.success('평가가 제출되었습니다. 감사합니다!');
        setRating(0);
        setFeedback('');
        setEvaluationSubmitted(true);
      } else {
        throw new Error('평가 제출에 실패했습니다.');
      }
    } catch (error) {
      console.error('평가 제출 오류:', error);
      toast.error('평가 제출에 실패했습니다. 다시 시도해주세요.');
    }
  }, [rating, feedback, videoUrl]);

  const handleDownload = useCallback(() => {
    const link = document.createElement('a');
    link.href = videoUrl;
    link.download = `manion-solution-${Date.now()}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('영상 다운로드가 시작되었습니다!');
  }, [videoUrl]);

  const handleShare = useCallback(() => {
    const shareUrl = window.location.href;
    navigator.clipboard.writeText(shareUrl);
    toast.success('링크가 복사되었습니다!');
  }, []);



  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Success Status - 맨 위 */}
        <div className="flex items-center gap-4 justify-center">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-white" />
          </div>
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white">풀이 완료!</h2>
            <p className="text-slate-300">AI가 분석한 단계별 풀이과정을 확인하세요</p>
          </div>
        </div>

        {/* Video Section */}
        <Card className="border-blue-500/30 bg-card/50 backdrop-blur-lg overflow-hidden">
          <div className="p-6">
            <video 
              key={videoUrl}
              controls 
              preload="metadata"
              className="w-full rounded-lg max-h-96"
              src={videoUrl}
            >
              브라우저가 동영상을 지원하지 않습니다.
            </video>
          </div>
        </Card>

        {/* Action Buttons - 영상 바로 아래 */}
        <div className="flex justify-center gap-4">
          <Button
            onClick={handleDownload}
            className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            다운로드
          </Button>
          
          <Button
            onClick={handleShare}
            variant="outline"
            className="border-blue-500/50 text-blue-300 hover:bg-blue-500/10"
          >
            <Share2 className="w-4 h-4 mr-2" />
            공유
          </Button>
          
          <Button
            onClick={onStartNew}
            variant="outline"
            className="border-purple-500/50 text-purple-300 hover:bg-purple-500/10"
          >
            새 문제 시작
          </Button>
        </div>

        {/* Video Evaluation Section */}
        {!evaluationSubmitted && (
          <Card className="border-yellow-500/30 bg-card/50 backdrop-blur-lg">
            <div className="p-6 space-y-6">
              <h3 className="text-xl font-bold text-white text-center">영상을 평가해주세요!</h3>
              
              {/* Star Rating */}
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-slate-300">별점:</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => handleStarClick(star)}
                        onMouseEnter={() => setHoveredStar(star)}
                        onMouseLeave={() => setHoveredStar(0)}
                        className="text-2xl transition-colors cursor-pointer transform hover:scale-110"
                      >
                        <Star
                          className={`w-8 h-8 ${
                            star <= (hoveredStar || rating)
                              ? 'text-yellow-400 fill-yellow-400'
                              : 'text-slate-600'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                {rating > 0 && (
                  <p className="text-center text-yellow-300 text-sm">
                    {rating}점을 선택하셨습니다
                  </p>
                )}
              </div>

              {/* Feedback Input */}
              <div className="space-y-3">
                <label className="text-slate-300 block">이런점이 개선되었으면 좋겠어요!</label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="영상에 대한 의견을 자유롭게 남겨주세요..."
                  rows={3}
                  maxLength={200}
                  className="w-full bg-slate-800/50 border border-slate-600 rounded-lg px-4 py-3 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-none"
                />
                <div className="text-right text-xs text-slate-400">
                  {feedback.length}/200
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-center">
                <Button
                  className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white px-6 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleSubmitEvaluation}
                  disabled={rating === 0}
                >
                  평가 제출하기
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Solution Steps Section - 맨 아래 */}
        <div className="space-y-8">
          <h3 className="text-2xl font-bold text-white text-center">풀이 과정</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Step 1 */}
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <div className="space-y-2">
                <h4 className="text-lg font-semibold text-white">문제 분석</h4>
                <p className="text-slate-300 text-sm">주어진 정보와 구하고자 하는 값을 명확히 파악</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <div className="space-y-2">
                <h4 className="text-lg font-semibold text-white">조건 분석</h4>
                <p className="text-slate-300 text-sm">각 조건들을 수식으로 표현하고 관계 파악</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <div className="space-y-2">
                <h4 className="text-lg font-semibold text-white">문제 풀이</h4>
                <p className="text-slate-300 text-sm">적절한 공식과 정리를 활용하여 단계별 해결</p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto">
                <span className="text-2xl font-bold text-white">4</span>
              </div>
              <div className="space-y-2">
                <h4 className="text-lg font-semibold text-white">결과 해석</h4>
                <p className="text-slate-300 text-sm">구한 답의 의미를 해석하고 조건 만족 확인</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};