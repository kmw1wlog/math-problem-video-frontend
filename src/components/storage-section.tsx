import React, { useState, useEffect } from 'react';
import { ArrowLeft, Image, Video, Calendar, Download, Trash2, Eye, X, Search, MessageSquare, Star } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from 'sonner@2.0.3';
import { authManager, User } from '../utils/auth';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface ProblemHistory {
  problemId: string;
  title: string;
  imageUrl?: string;
  videoUrl?: string;
  createdAt: string;
  status: 'completed' | 'processing' | 'failed';
}

interface CommentHistory {
  type: 'post' | 'reply';
  postId: string;
  replyId?: string;
  content: string;
  boardType?: string;
  createdAt: string;
}

interface EvaluationHistory {
  evaluationId: string;
  rating: number;
  feedback: string;
  videoUrl: string;
  createdAt: string;
}

interface UserHistoryData {
  problems: ProblemHistory[];
  comments: CommentHistory[];
  evaluations: EvaluationHistory[];
  stats: {
    totalProblems: number;
    completedProblems: number;
    totalComments: number;
    totalEvaluations: number;
  };
}

interface StorageSectionProps {
  user: User | null;
  onBack: () => void;
  onClose: () => void;
}

export const StorageSection: React.FC<StorageSectionProps> = ({ user, onBack, onClose }) => {
  const [historyData, setHistoryData] = useState<UserHistoryData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserHistory();
    }
  }, [user]);

  const fetchUserHistory = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const accessToken = authManager.getAccessToken();
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3a80e39f/user/history`, {
        headers: {
          'Authorization': `Bearer ${accessToken || publicAnonKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user history');
      }

      const data = await response.json();
      setHistoryData(data);
    } catch (error) {
      console.error('Error fetching user history:', error);
      toast.error('데이터를 불러오는데 실패했습니다.');
      // Fallback to empty data
      setHistoryData({
        problems: [],
        comments: [],
        evaluations: [],
        stats: { totalProblems: 0, completedProblems: 0, totalComments: 0, totalEvaluations: 0 }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProblems = historyData?.problems.filter(problem =>
    problem.title.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const filteredComments = historyData?.comments.filter(comment =>
    comment.content.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const filteredEvaluations = historyData?.evaluations.filter(evaluation =>
    evaluation.feedback.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleDownload = (problem: ProblemHistory, type: 'image' | 'video') => {
    const url = type === 'image' ? problem.imageUrl : problem.videoUrl;
    if (!url) {
      toast.error('파일을 찾을 수 없습니다.');
      return;
    }

    // Create download link
    const link = document.createElement('a');
    link.href = url;
    link.download = `${problem.title}_${type}.${type === 'image' ? 'jpg' : 'mp4'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`${type === 'image' ? '이미지' : '영상'} 다운로드가 시작되었습니다.`);
  };

  const handleDeleteProblem = async (problemId: string) => {
    if (!user) return;
    
    try {
      const accessToken = authManager.getAccessToken();
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3a80e39f/user/history/problem/${problemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken || publicAnonKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete problem');
      }

      // Update local state
      if (historyData) {
        setHistoryData({
          ...historyData,
          problems: historyData.problems.filter(p => p.problemId !== problemId),
          stats: {
            ...historyData.stats,
            totalProblems: historyData.stats.totalProblems - 1
          }
        });
      }
      
      toast.success('문제가 삭제되었습니다.');
    } catch (error) {
      console.error('Error deleting problem:', error);
      toast.error('삭제에 실패했습니다.');
    }
  };

  const handleUpdateTitle = async (problemId: string, newTitle: string) => {
    if (!user || !newTitle.trim()) return;
    
    try {
      const accessToken = authManager.getAccessToken();
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3a80e39f/user/history/problem/${problemId}/title`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken || publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: newTitle.trim() }),
      });

      if (!response.ok) {
        throw new Error('Failed to update problem title');
      }

      // Update local state
      if (historyData) {
        setHistoryData({
          ...historyData,
          problems: historyData.problems.map(p => 
            p.problemId === problemId ? { ...p, title: newTitle.trim() } : p
          )
        });
      }
      
      toast.success('제목이 변경되었습니다.');
    } catch (error) {
      console.error('Error updating problem title:', error);
      toast.error('제목 변경에 실패했습니다.');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">완료</Badge>;
      case 'processing':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">처리중</Badge>;
      case 'failed':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">실패</Badge>;
      default:
        return null;
    }
  };

  if (!user) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm">
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-card/95 backdrop-blur-lg border-red-500/30">
            <div className="p-6 text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">접근 권한 없음</h2>
              <p className="text-slate-300">저장소는 로그인 후 이용 가능합니다.</p>
              <Button onClick={onClose} className="bg-gradient-to-r from-blue-500 to-purple-500">
                확인
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm">
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-4xl bg-card/95 backdrop-blur-lg border-cyan-500/30 max-h-[90vh] overflow-hidden">
          <div className="p-6 space-y-6 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  onClick={onBack}
                  variant="ghost"
                  size="sm"
                  className="text-slate-400 hover:text-white"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <h2 className="text-2xl font-bold text-white">내 저장소</h2>
              </div>
              <Button
                onClick={onClose}
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="문제 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-800/50 border-slate-600 text-white"
              />
            </div>

            <Separator className="bg-slate-600" />

            {/* Statistics */}
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-3 bg-slate-800/30 rounded-lg">
                <p className="text-2xl font-bold text-blue-400">{historyData?.stats.totalProblems || 0}</p>
                <p className="text-slate-400 text-sm">총 문제</p>
              </div>
              <div className="text-center p-3 bg-slate-800/30 rounded-lg">
                <p className="text-2xl font-bold text-green-400">
                  {historyData?.stats.completedProblems || 0}
                </p>
                <p className="text-slate-400 text-sm">완료됨</p>
              </div>
              <div className="text-center p-3 bg-slate-800/30 rounded-lg">
                <p className="text-2xl font-bold text-purple-400">{historyData?.stats.totalComments || 0}</p>
                <p className="text-slate-400 text-sm">댓글</p>
              </div>
              <div className="text-center p-3 bg-slate-800/30 rounded-lg">
                <p className="text-2xl font-bold text-yellow-400">{historyData?.stats.totalEvaluations || 0}</p>
                <p className="text-slate-400 text-sm">평가</p>
              </div>
            </div>

            {/* Content */}
            <Tabs defaultValue="problems" className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-3 bg-slate-800/50">
                <TabsTrigger value="problems">문제</TabsTrigger>
                <TabsTrigger value="comments">댓글</TabsTrigger>
                <TabsTrigger value="evaluations">평가</TabsTrigger>
              </TabsList>

              <TabsContent value="problems" className="flex-1 overflow-auto">
                <ProblemList
                  problems={filteredProblems}
                  onDownload={handleDownload}
                  onDelete={handleDeleteProblem}
                  onUpdateTitle={handleUpdateTitle}
                  isLoading={isLoading}
                />
              </TabsContent>

              <TabsContent value="comments" className="flex-1 overflow-auto">
                <CommentList
                  comments={filteredComments}
                  isLoading={isLoading}
                />
              </TabsContent>

              <TabsContent value="evaluations" className="flex-1 overflow-auto">
                <EvaluationList
                  evaluations={filteredEvaluations}
                  isLoading={isLoading}
                />
              </TabsContent>
            </Tabs>
          </div>
        </Card>
      </div>
    </div>
  );
};

interface ProblemListProps {
  problems: ProblemHistory[];
  onDownload: (problem: ProblemHistory, type: 'image' | 'video') => void;
  onDelete: (problemId: string) => void;
  onUpdateTitle: (problemId: string, newTitle: string) => void;
  isLoading: boolean;
}

const ProblemList: React.FC<ProblemListProps> = ({ problems, onDownload, onDelete, onUpdateTitle, isLoading }) => {
  const [editingProblemId, setEditingProblemId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">완료</Badge>;
      case 'processing':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">처리중</Badge>;
      case 'failed':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">실패</Badge>;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleTitleClick = (problem: ProblemHistory) => {
    setEditingProblemId(problem.problemId);
    setEditTitle(problem.title);
  };

  const handleTitleSave = (problemId: string) => {
    if (editTitle.trim() && editTitle.trim() !== problems.find(p => p.problemId === problemId)?.title) {
      onUpdateTitle(problemId, editTitle.trim());
    }
    setEditingProblemId(null);
    setEditTitle('');
  };

  const handleTitleCancel = () => {
    setEditingProblemId(null);
    setEditTitle('');
  };

  const handleKeyDown = (e: React.KeyboardEvent, problemId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTitleSave(problemId);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleTitleCancel();
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="p-4 bg-slate-800/30 rounded-lg animate-pulse">
            <div className="h-4 bg-slate-700 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-slate-700 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (problems.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">저장된 문제가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {problems.map(problem => (
        <Card key={problem.problemId} className="p-4 bg-slate-800/30 border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3">
                {editingProblemId === problem.problemId ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, problem.problemId)}
                      onBlur={() => handleTitleSave(problem.problemId)}
                      className="bg-blue-500/20 border-blue-500/50 text-white font-medium px-2 py-1 text-sm"
                      autoFocus
                      maxLength={200}
                    />
                    <Button
                      onClick={() => handleTitleSave(problem.problemId)}
                      size="sm"
                      className="bg-green-500 hover:bg-green-600 text-white text-xs px-2 py-1"
                    >
                      저장
                    </Button>
                    <Button
                      onClick={handleTitleCancel}
                      size="sm"
                      variant="ghost"
                      className="text-slate-400 hover:text-white text-xs px-2 py-1"
                    >
                      취소
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleTitleClick(problem)}
                    className="text-white font-medium hover:bg-blue-500/20 px-2 py-1 rounded transition-colors cursor-pointer text-left"
                    title="클릭하여 제목 편집"
                  >
                    {problem.title}
                  </button>
                )}
                {getStatusBadge(problem.status)}
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-400">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(problem.createdAt)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Image Download */}
              {problem.imageUrl && (
                <Button
                  onClick={() => onDownload(problem, 'image')}
                  variant="ghost"
                  size="sm"
                  className="text-slate-400 hover:text-blue-300"
                  title="이미지 다운로드"
                >
                  <Image className="w-4 h-4" />
                </Button>
              )}

              {/* Video Download */}
              {problem.videoUrl && (
                <Button
                  onClick={() => onDownload(problem, 'video')}
                  variant="ghost"
                  size="sm"
                  className="text-slate-400 hover:text-green-300"
                  title="영상 다운로드"
                >
                  <Video className="w-4 h-4" />
                </Button>
              )}

              {/* Delete */}
              <Button
                onClick={() => onDelete(problem.problemId)}
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-red-300"
                title="삭제"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

interface CommentListProps {
  comments: CommentHistory[];
  isLoading: boolean;
}

const CommentList: React.FC<CommentListProps> = ({ comments, isLoading }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="p-4 bg-slate-800/30 rounded-lg animate-pulse">
            <div className="h-4 bg-slate-700 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-slate-700 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">작성한 댓글이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {comments.map((comment, index) => (
        <Card key={`${comment.postId}-${index}`} className="p-4 bg-slate-800/30 border-slate-700">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-400" />
                <Badge variant="outline" className="text-xs">
                  {comment.type === 'post' ? '게시글' : '댓글'}
                </Badge>
                {comment.boardType && (
                  <Badge variant="outline" className="text-xs">
                    {comment.boardType === 'general' ? '일반' : '익명'}
                  </Badge>
                )}
              </div>
              <span className="text-xs text-slate-400">{formatDate(comment.createdAt)}</span>
            </div>
            
            <p className="text-white text-sm">{comment.content}</p>
          </div>
        </Card>
      ))}
    </div>
  );
};

interface EvaluationListProps {
  evaluations: EvaluationHistory[];
  isLoading: boolean;
}

const EvaluationList: React.FC<EvaluationListProps> = ({ evaluations, isLoading }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? 'text-yellow-400 fill-current' : 'text-slate-600'
        }`}
      />
    ));
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="p-4 bg-slate-800/30 rounded-lg animate-pulse">
            <div className="h-4 bg-slate-700 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-slate-700 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (evaluations.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">작성한 평가가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {evaluations.map((evaluation) => (
        <Card key={evaluation.evaluationId} className="p-4 bg-slate-800/30 border-slate-700">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {renderStars(evaluation.rating)}
                <span className="text-white font-medium">({evaluation.rating}/5)</span>
              </div>
              <span className="text-xs text-slate-400">{formatDate(evaluation.createdAt)}</span>
            </div>
            
            {evaluation.feedback && (
              <p className="text-slate-300 text-sm">{evaluation.feedback}</p>
            )}
            
            {evaluation.videoUrl && (
              <div className="text-xs text-slate-500">
                영상: {evaluation.videoUrl}
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
};