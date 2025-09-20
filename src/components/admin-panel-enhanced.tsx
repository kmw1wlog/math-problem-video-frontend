import React, { useState, useEffect } from 'react';
import { Shield, FileImage, Eye, BarChart3, Activity, MessageSquare, EyeOff, Users, Star, ThumbsUp, Trash2, TrendingUp, Calendar, Database, AlertTriangle } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { Switch } from './ui/switch';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { authManager } from '../utils/auth';

interface Problem {
  id: string;
  fileName: string;
  status: 'processing' | 'completed' | 'failed';
  uploadTime: string;
  videoUrl?: string;
  imageUrl?: string;
}

interface Post {
  id: string;
  content: string;
  author: string;
  boardType: 'general' | 'anonymous';
  userId?: string;
  createdAt: string;
  likes: number;
  dislikes: number;
  replies: Reply[];
}

interface Reply {
  id: string;
  content: string;
  author: string;
  userId?: string;
  createdAt: string;
  isAdmin: boolean;
}

interface Evaluation {
  id: string;
  rating: number;
  feedback: string;
  videoUrl: string;
  createdAt: string;
}

interface ComprehensiveStats {
  problems: {
    total: number;
    completed: number;
    processing: number;
    failed: number;
    successRate: number;
  };
  community: {
    totalPosts: number;
    generalPosts: number;
    anonymousPosts: number;
    totalReplies: number;
    averageRepliesPerPost: number;
    totalLikes: number;
    totalDislikes: number;
  };
  evaluations: {
    total: number;
    averageRating: number;
    ratingDistribution: { [key: string]: number };
    withFeedback: number;
  };
  recent: {
    problemsLast30Days: number;
    postsLast30Days: number;
    evaluationsLast30Days: number;
  };
  overview: {
    totalUsers: number;
    totalActivity: number;
  };
}

interface AdminPanelProps {
  onClose: () => void;
}

export const AdminPanelEnhanced: React.FC<AdminPanelProps> = ({ onClose }) => {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [generalPosts, setGeneralPosts] = useState<Post[]>([]);
  const [anonymousPosts, setAnonymousPosts] = useState<Post[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [comprehensiveStats, setComprehensiveStats] = useState<ComprehensiveStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showPostDialog, setShowPostDialog] = useState(false);
  const [deleteModeEnabled, setDeleteModeEnabled] = useState(false);
  const [showDeleteModeWarning, setShowDeleteModeWarning] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchProblems(),
      fetchPosts(),
      fetchEvaluations(),
      fetchComprehensiveStats()
    ]);
    setLoading(false);
  };

  const fetchProblems = async () => {
    try {
      const accessToken = authManager.getAccessToken();
      if (!accessToken) {
        console.error('No access token available');
        return;
      }

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3a80e39f/admin/problems`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setProblems(data);
      } else {
        console.error('Failed to fetch problems:', response.status);
      }
    } catch (error) {
      console.error('Error fetching problems:', error);
    }
  };

  const fetchPosts = async () => {
    try {
      const [generalResponse, anonymousResponse] = await Promise.all([
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3a80e39f/community/posts/general`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3a80e39f/community/posts/anonymous`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        })
      ]);
      
      if (generalResponse.ok && anonymousResponse.ok) {
        const generalData = await generalResponse.json();
        const anonymousData = await anonymousResponse.json();
        setGeneralPosts(generalData);
        setAnonymousPosts(anonymousData);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
  };

  const fetchEvaluations = async () => {
    try {
      const accessToken = authManager.getAccessToken();
      if (!accessToken) {
        console.error('No access token available');
        return;
      }

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3a80e39f/admin/evaluations`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setEvaluations(data);
      } else {
        console.error('Failed to fetch evaluations:', response.status);
      }
    } catch (error) {
      console.error('Error fetching evaluations:', error);
    }
  };

  const fetchComprehensiveStats = async () => {
    try {
      const accessToken = authManager.getAccessToken();
      if (!accessToken) {
        console.error('No access token available');
        return;
      }

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3a80e39f/admin/stats`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setComprehensiveStats(data);
      } else {
        console.error('Failed to fetch comprehensive stats:', response.status);
      }
    } catch (error) {
      console.error('Error fetching comprehensive stats:', error);
    }
  };

  const deleteProblem = async (problemId: string) => {
    try {
      const accessToken = authManager.getAccessToken();
      if (!accessToken) {
        toast.error('관리자 인증이 필요합니다.');
        return;
      }

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3a80e39f/admin/problems/${problemId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      
      if (response.ok) {
        toast.success('문제가 삭제되었습니다.');
        fetchAllData();
      } else {
        toast.error('문제 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error deleting problem:', error);
      toast.error('문제 삭제 중 오류가 발생했습니다.');
    }
  };

  const deletePost = async (postId: string) => {
    try {
      const accessToken = authManager.getAccessToken();
      if (!accessToken) {
        toast.error('관리자 인증이 필요합니다.');
        return;
      }

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3a80e39f/admin/posts/${postId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      
      if (response.ok) {
        toast.success('게시글이 삭제되었습니다.');
        fetchAllData();
      } else {
        toast.error('게시글 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('게시글 삭제 중 오류가 발생했습니다.');
    }
  };

  const deleteReply = async (postId: string, replyId: string) => {
    try {
      const accessToken = authManager.getAccessToken();
      if (!accessToken) {
        toast.error('관리자 인증이 필요합니다.');
        return;
      }

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3a80e39f/admin/posts/${postId}/replies/${replyId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      
      if (response.ok) {
        toast.success('댓글이 삭제되었습니다.');
        fetchAllData();
      } else {
        toast.error('댓글 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error deleting reply:', error);
      toast.error('댓글 삭제 중 오류가 발생했습니다.');
    }
  };

  const deleteEvaluation = async (evaluationId: string) => {
    try {
      const accessToken = authManager.getAccessToken();
      if (!accessToken) {
        toast.error('관리자 인증이 필요합니다.');
        return;
      }

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3a80e39f/admin/evaluations/${evaluationId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      
      if (response.ok) {
        toast.success('평가가 삭제되었습니다.');
        fetchAllData();
      } else {
        toast.error('평가 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error deleting evaluation:', error);
      toast.error('평가 삭제 중 오류가 발생했습니다.');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/20 text-green-300">완료</Badge>;
      case 'processing':
        return <Badge className="bg-yellow-500/20 text-yellow-300">처리중</Badge>;
      case 'failed':
        return <Badge className="bg-red-500/20 text-red-300">실패</Badge>;
      default:
        return <Badge className="bg-gray-500/20 text-gray-300">알 수 없음</Badge>;
    }
  };

  const getBoardTypeBadge = (boardType: string) => {
    if (boardType === 'general') {
      return <Badge className="bg-blue-500/20 text-blue-300"><Eye className="w-3 h-3 mr-1" />일반</Badge>;
    } else {
      return <Badge className="bg-orange-500/20 text-orange-300"><EyeOff className="w-3 h-3 mr-1" />익명</Badge>;
    }
  };

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

  const truncateText = (text: string, maxLength: number = 50) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const handleDeleteModeToggle = (enabled: boolean) => {
    if (enabled) {
      setShowDeleteModeWarning(true);
    } else {
      setDeleteModeEnabled(false);
    }
  };

  const confirmDeleteMode = () => {
    setDeleteModeEnabled(true);
    setShowDeleteModeWarning(false);
    toast.warning('삭제 관리 모드가 활성화되었습니다. 주의해서 사용하세요.');
  };

  if (loading || !comprehensiveStats) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <p className="text-slate-300">관리자 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">고급 관리자 패널</h1>
              <p className="text-slate-300">Manion 시스템 통합 관리 및 모니터링</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Delete Management Mode Toggle */}
            <div className="flex items-center gap-3 px-4 py-2 bg-card/50 backdrop-blur-lg border border-slate-600 rounded-lg">
              <div className="flex items-center gap-2">
                <Trash2 className={`w-4 h-4 ${deleteModeEnabled ? 'text-red-400' : 'text-slate-400'}`} />
                <span className="text-sm text-slate-300">삭제 관리</span>
              </div>
              <Switch
                checked={deleteModeEnabled}
                onCheckedChange={handleDeleteModeToggle}
                className="data-[state=checked]:bg-red-600"
              />
              {deleteModeEnabled && (
                <Badge variant="destructive" className="text-xs">
                  활성화
                </Badge>
              )}
            </div>
            <Button
              onClick={onClose}
              variant="outline"
              className="border-slate-600"
            >
              메인으로 돌아가기
            </Button>
          </div>
        </div>

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
          <Card className="border-blue-500/30 bg-card/50 backdrop-blur-lg">
            <div className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-400" />
                <span className="text-slate-300 text-sm">총 문제</span>
              </div>
              <p className="text-2xl font-bold text-white">{comprehensiveStats.problems.total}</p>
              <p className="text-xs text-slate-400">성공률 {comprehensiveStats.problems.successRate}%</p>
            </div>
          </Card>

          <Card className="border-green-500/30 bg-card/50 backdrop-blur-lg">
            <div className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-green-400" />
                <span className="text-slate-300 text-sm">완료 문제</span>
              </div>
              <p className="text-2xl font-bold text-white">{comprehensiveStats.problems.completed}</p>
              <p className="text-xs text-slate-400">처리중 {comprehensiveStats.problems.processing}</p>
            </div>
          </Card>

          <Card className="border-yellow-500/30 bg-card/50 backdrop-blur-lg">
            <div className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-yellow-400" />
                <span className="text-slate-300 text-sm">총 게시글</span>
              </div>
              <p className="text-2xl font-bold text-white">{comprehensiveStats.community.totalPosts}</p>
              <p className="text-xs text-slate-400">댓글 {comprehensiveStats.community.totalReplies}</p>
            </div>
          </Card>

          <Card className="border-purple-500/30 bg-card/50 backdrop-blur-lg">
            <div className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                <span className="text-slate-300 text-sm">활성 사용자</span>
              </div>
              <p className="text-2xl font-bold text-white">{comprehensiveStats.overview.totalUsers}</p>
              <p className="text-xs text-slate-400">등록된 유저</p>
            </div>
          </Card>

          <Card className="border-orange-500/30 bg-card/50 backdrop-blur-lg">
            <div className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <ThumbsUp className="w-4 h-4 text-orange-400" />
                <span className="text-slate-300 text-sm">영상 평가</span>
              </div>
              <p className="text-2xl font-bold text-white">{comprehensiveStats.evaluations.total}</p>
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                <span className="text-xs text-slate-400">{comprehensiveStats.evaluations.averageRating}</span>
              </div>
            </div>
          </Card>

          <Card className="border-indigo-500/30 bg-card/50 backdrop-blur-lg">
            <div className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-400" />
                <span className="text-slate-300 text-sm">총 활동</span>
              </div>
              <p className="text-2xl font-bold text-white">{comprehensiveStats.overview.totalActivity}</p>
              <p className="text-xs text-slate-400">30일간 활동</p>
            </div>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="statistics" className="space-y-6">
          <TabsList className="bg-card/50 backdrop-blur-lg border border-slate-600">
            <TabsTrigger value="statistics" className="data-[state=active]:bg-purple-500/20">
              <Database className="w-4 h-4 mr-2" />
              통합 통계
            </TabsTrigger>
            <TabsTrigger value="problems" className="data-[state=active]:bg-purple-500/20">
              <FileImage className="w-4 h-4 mr-2" />
              문제 관리
            </TabsTrigger>
            <TabsTrigger value="community" className="data-[state=active]:bg-purple-500/20">
              <MessageSquare className="w-4 h-4 mr-2" />
              게시판 관리
            </TabsTrigger>
            <TabsTrigger value="evaluations" className="data-[state=active]:bg-purple-500/20">
              <Star className="w-4 h-4 mr-2" />
              평가 관리
            </TabsTrigger>
          </TabsList>

          {/* Statistics Tab */}
          <TabsContent value="statistics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Problem Statistics */}
              <Card className="border-blue-500/30 bg-card/50 backdrop-blur-lg">
                <div className="p-6 space-y-4">
                  <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-400" />
                    문제 처리 통계
                  </h3>
                  <Table>
                    <TableBody>
                      <TableRow className="border-slate-700">
                        <TableCell className="text-slate-300">총 업로드 문제</TableCell>
                        <TableCell className="text-right text-white font-semibold">{comprehensiveStats.problems.total}</TableCell>
                      </TableRow>
                      <TableRow className="border-slate-700">
                        <TableCell className="text-slate-300">완료된 문제</TableCell>
                        <TableCell className="text-right text-green-400 font-semibold">{comprehensiveStats.problems.completed}</TableCell>
                      </TableRow>
                      <TableRow className="border-slate-700">
                        <TableCell className="text-slate-300">처리중인 문제</TableCell>
                        <TableCell className="text-right text-yellow-400 font-semibold">{comprehensiveStats.problems.processing}</TableCell>
                      </TableRow>
                      <TableRow className="border-slate-700">
                        <TableCell className="text-slate-300">실패한 문제</TableCell>
                        <TableCell className="text-right text-red-400 font-semibold">{comprehensiveStats.problems.failed}</TableCell>
                      </TableRow>
                      <TableRow className="border-slate-700">
                        <TableCell className="text-slate-300">성공률</TableCell>
                        <TableCell className="text-right text-blue-400 font-semibold">{comprehensiveStats.problems.successRate}%</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </Card>

              {/* Community Statistics */}
              <Card className="border-green-500/30 bg-card/50 backdrop-blur-lg">
                <div className="p-6 space-y-4">
                  <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-green-400" />
                    커뮤니티 통계
                  </h3>
                  <Table>
                    <TableBody>
                      <TableRow className="border-slate-700">
                        <TableCell className="text-slate-300">총 게시글</TableCell>
                        <TableCell className="text-right text-white font-semibold">{comprehensiveStats.community.totalPosts}</TableCell>
                      </TableRow>
                      <TableRow className="border-slate-700">
                        <TableCell className="text-slate-300">일반 게시글</TableCell>
                        <TableCell className="text-right text-blue-400 font-semibold">{comprehensiveStats.community.generalPosts}</TableCell>
                      </TableRow>
                      <TableRow className="border-slate-700">
                        <TableCell className="text-slate-300">익명 게시글</TableCell>
                        <TableCell className="text-right text-orange-400 font-semibold">{comprehensiveStats.community.anonymousPosts}</TableCell>
                      </TableRow>
                      <TableRow className="border-slate-700">
                        <TableCell className="text-slate-300">총 댓글</TableCell>
                        <TableCell className="text-right text-purple-400 font-semibold">{comprehensiveStats.community.totalReplies}</TableCell>
                      </TableRow>
                      <TableRow className="border-slate-700">
                        <TableCell className="text-slate-300">게시글당 평균 댓글</TableCell>
                        <TableCell className="text-right text-green-400 font-semibold">{comprehensiveStats.community.averageRepliesPerPost}</TableCell>
                      </TableRow>
                      <TableRow className="border-slate-700">
                        <TableCell className="text-slate-300">총 좋아요</TableCell>
                        <TableCell className="text-right text-green-400 font-semibold">{comprehensiveStats.community.totalLikes}</TableCell>
                      </TableRow>
                      <TableRow className="border-slate-700">
                        <TableCell className="text-slate-300">총 싫어요</TableCell>
                        <TableCell className="text-right text-red-400 font-semibold">{comprehensiveStats.community.totalDislikes}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </Card>

              {/* Evaluation Statistics */}
              <Card className="border-yellow-500/30 bg-card/50 backdrop-blur-lg">
                <div className="p-6 space-y-4">
                  <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-400" />
                    영상 평가 통계
                  </h3>
                  <Table>
                    <TableBody>
                      <TableRow className="border-slate-700">
                        <TableCell className="text-slate-300">총 평가 수</TableCell>
                        <TableCell className="text-right text-white font-semibold">{comprehensiveStats.evaluations.total}</TableCell>
                      </TableRow>
                      <TableRow className="border-slate-700">
                        <TableCell className="text-slate-300">평균 별점</TableCell>
                        <TableCell className="text-right text-yellow-400 font-semibold">{comprehensiveStats.evaluations.averageRating}</TableCell>
                      </TableRow>
                      <TableRow className="border-slate-700">
                        <TableCell className="text-slate-300">피드백 포함 평가</TableCell>
                        <TableCell className="text-right text-blue-400 font-semibold">{comprehensiveStats.evaluations.withFeedback}</TableCell>
                      </TableRow>
                      <TableRow className="border-slate-700">
                        <TableCell className="text-slate-300">5점 평가</TableCell>
                        <TableCell className="text-right text-green-400 font-semibold">{comprehensiveStats.evaluations.ratingDistribution['5']}</TableCell>
                      </TableRow>
                      <TableRow className="border-slate-700">
                        <TableCell className="text-slate-300">4점 평가</TableCell>
                        <TableCell className="text-right text-blue-400 font-semibold">{comprehensiveStats.evaluations.ratingDistribution['4']}</TableCell>
                      </TableRow>
                      <TableRow className="border-slate-700">
                        <TableCell className="text-slate-300">3점 평가</TableCell>
                        <TableCell className="text-right text-yellow-400 font-semibold">{comprehensiveStats.evaluations.ratingDistribution['3']}</TableCell>
                      </TableRow>
                      <TableRow className="border-slate-700">
                        <TableCell className="text-slate-300">2점 평가</TableCell>
                        <TableCell className="text-right text-orange-400 font-semibold">{comprehensiveStats.evaluations.ratingDistribution['2']}</TableCell>
                      </TableRow>
                      <TableRow className="border-slate-700">
                        <TableCell className="text-slate-300">1점 평가</TableCell>
                        <TableCell className="text-right text-red-400 font-semibold">{comprehensiveStats.evaluations.ratingDistribution['1']}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </Card>

              {/* Recent Activity */}
              <Card className="border-purple-500/30 bg-card/50 backdrop-blur-lg">
                <div className="p-6 space-y-4">
                  <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-purple-400" />
                    최근 30일 활동
                  </h3>
                  <Table>
                    <TableBody>
                      <TableRow className="border-slate-700">
                        <TableCell className="text-slate-300">새 문제</TableCell>
                        <TableCell className="text-right text-blue-400 font-semibold">{comprehensiveStats.recent.problemsLast30Days}</TableCell>
                      </TableRow>
                      <TableRow className="border-slate-700">
                        <TableCell className="text-slate-300">새 게시글</TableCell>
                        <TableCell className="text-right text-green-400 font-semibold">{comprehensiveStats.recent.postsLast30Days}</TableCell>
                      </TableRow>
                      <TableRow className="border-slate-700">
                        <TableCell className="text-slate-300">새 평가</TableCell>
                        <TableCell className="text-right text-yellow-400 font-semibold">{comprehensiveStats.recent.evaluationsLast30Days}</TableCell>
                      </TableRow>
                      <TableRow className="border-slate-700">
                        <TableCell className="text-slate-300">총 활동량</TableCell>
                        <TableCell className="text-right text-purple-400 font-semibold">
                          {comprehensiveStats.recent.problemsLast30Days + 
                           comprehensiveStats.recent.postsLast30Days + 
                           comprehensiveStats.recent.evaluationsLast30Days}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Problems Management Tab */}
          <TabsContent value="problems" className="space-y-6">
            <Card className="border-slate-600/30 bg-card/50 backdrop-blur-lg">
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-white">업로드된 문제 관리</h2>
                  <Button
                    onClick={fetchAllData}
                    size="sm"
                    variant="outline"
                    className="border-slate-600"
                  >
                    새로고침
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-600">
                        <TableHead className="text-slate-300">이미지</TableHead>
                        <TableHead className="text-slate-300">문제 ID</TableHead>
                        <TableHead className="text-slate-300">업로드 시간</TableHead>
                        <TableHead className="text-slate-300">상태</TableHead>
                        <TableHead className="text-slate-300">영상</TableHead>
                        <TableHead className="text-slate-300">작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {problems.map((problem) => (
                        <TableRow key={problem.id} className="border-slate-700">
                          <TableCell>
                            {problem.imageUrl ? (
                              <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-800">
                                <ImageWithFallback
                                  src={problem.imageUrl}
                                  alt="Math problem"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-16 h-16 rounded-lg bg-slate-800 flex items-center justify-center">
                                <FileImage className="w-6 h-6 text-slate-400" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-slate-300 font-mono text-sm">
                            {problem.id.slice(0, 20)}...
                          </TableCell>
                          <TableCell className="text-slate-300">
                            {formatDate(problem.uploadTime)}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(problem.status)}
                          </TableCell>
                          <TableCell>
                            {problem.videoUrl ? (
                              <Badge className="bg-blue-500/20 text-blue-300">생성됨</Badge>
                            ) : (
                              <Badge className="bg-gray-500/20 text-gray-300">없음</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {problem.imageUrl && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => window.open(problem.imageUrl, '_blank')}
                                  className="text-blue-400 hover:text-blue-300"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              )}
                              {deleteModeEnabled && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-red-400 hover:text-red-300"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>문제 삭제</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        이 문제를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>취소</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteProblem(problem.id)}
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        삭제
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Community Management Tab */}
          <TabsContent value="community" className="space-y-6">
            <Card className="border-slate-600/30 bg-card/50 backdrop-blur-lg">
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-white">게시글 관리</h2>
                  <Button
                    onClick={fetchAllData}
                    size="sm"
                    variant="outline"
                    className="border-slate-600"
                  >
                    새로고침
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-600">
                        <TableHead className="text-slate-300">게시판</TableHead>
                        <TableHead className="text-slate-300">작성자</TableHead>
                        <TableHead className="text-slate-300">내용</TableHead>
                        <TableHead className="text-slate-300">작성시간</TableHead>
                        <TableHead className="text-slate-300">좋아요/싫어요</TableHead>
                        <TableHead className="text-slate-300">댓글</TableHead>
                        <TableHead className="text-slate-300">작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...generalPosts, ...anonymousPosts]
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .map((post) => (
                        <TableRow key={post.id} className="border-slate-700">
                          <TableCell>
                            {getBoardTypeBadge(post.boardType)}
                          </TableCell>
                          <TableCell className="text-slate-300">
                            {post.author}
                          </TableCell>
                          <TableCell className="text-slate-300 max-w-xs">
                            <button
                              onClick={() => {
                                setSelectedPost(post);
                                setShowPostDialog(true);
                              }}
                              className="text-left hover:text-blue-300 transition-colors"
                            >
                              {truncateText(post.content)}
                            </button>
                          </TableCell>
                          <TableCell className="text-slate-300 text-sm">
                            {formatDate(post.createdAt)}
                          </TableCell>
                          <TableCell className="text-slate-300">
                            <div className="flex gap-2">
                              <span className="text-green-400">{post.likes || 0}</span>
                              <span className="text-slate-500">/</span>
                              <span className="text-red-400">{post.dislikes || 0}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-300">
                            {post.replies?.length || 0}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedPost(post);
                                  setShowPostDialog(true);
                                }}
                                className="text-blue-400 hover:text-blue-300"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              {deleteModeEnabled && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-red-400 hover:text-red-300"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>게시글 삭제</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        이 게시글을 삭제하시겠습니까? 모든 댓글도 함께 삭제됩니다.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>취소</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deletePost(post.id)}
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        삭제
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Evaluations Management Tab */}
          <TabsContent value="evaluations" className="space-y-6">
            <Card className="border-slate-600/30 bg-card/50 backdrop-blur-lg">
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-white">영상 평가 관리</h2>
                  <Button
                    onClick={fetchAllData}
                    size="sm"
                    variant="outline"
                    className="border-slate-600"
                  >
                    새로고침
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-600">
                        <TableHead className="text-slate-300">별점</TableHead>
                        <TableHead className="text-slate-300">피드백</TableHead>
                        <TableHead className="text-slate-300">영상 URL</TableHead>
                        <TableHead className="text-slate-300">제출 시간</TableHead>
                        <TableHead className="text-slate-300">작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {evaluations.map((evaluation) => (
                        <TableRow key={evaluation.id} className="border-slate-700">
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {getRatingStars(evaluation.rating)}
                              <span className="text-slate-300 ml-2">{evaluation.rating}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-300 max-w-xs">
                            {evaluation.feedback ? (
                              <span className="text-slate-200">
                                {truncateText(evaluation.feedback, 30)}
                              </span>
                            ) : (
                              <span className="text-slate-500 italic">피드백 없음</span>
                            )}
                          </TableCell>
                          <TableCell className="text-slate-300 font-mono text-sm">
                            {evaluation.videoUrl ? truncateText(evaluation.videoUrl, 20) : '없음'}
                          </TableCell>
                          <TableCell className="text-slate-300 text-sm">
                            {formatDate(evaluation.createdAt)}
                          </TableCell>
                          <TableCell>
                            {deleteModeEnabled ? (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-400 hover:text-red-300"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>평가 삭제</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      이 평가를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>취소</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteEvaluation(evaluation.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      삭제
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            ) : (
                              <span className="text-slate-500 text-sm">삭제 관리 모드 필요</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Post Detail Dialog */}
        <Dialog open={showPostDialog} onOpenChange={setShowPostDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                게시글 상세보기
                {selectedPost && getBoardTypeBadge(selectedPost.boardType)}
              </DialogTitle>
            </DialogHeader>
            {selectedPost && (
              <div className="space-y-4">
                <div className="bg-slate-800/30 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{selectedPost.author}</span>
                    </div>
                    <span className="text-sm text-slate-400">{formatDate(selectedPost.createdAt)}</span>
                  </div>
                  <p className="text-slate-200 whitespace-pre-wrap mb-3">{selectedPost.content}</p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-green-400">좋아요 {selectedPost.likes || 0}</span>
                    <span className="text-red-400">싫어요 {selectedPost.dislikes || 0}</span>
                    <span className="text-blue-400">댓글 {selectedPost.replies?.length || 0}</span>
                  </div>
                </div>

                {selectedPost.replies && selectedPost.replies.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-white">댓글 목록</h4>
                    {selectedPost.replies.map((reply) => (
                      <div key={reply.id} className="bg-slate-800/20 rounded-lg p-4 border-l-2 border-blue-500">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white">{reply.author}</span>
                            {reply.isAdmin && (
                              <Badge variant="secondary" className="text-xs bg-purple-500/20 text-purple-300">
                                관리자
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">{formatDate(reply.createdAt)}</span>
                            {deleteModeEnabled && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-400 hover:text-red-300 h-6 w-6 p-0"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>댓글 삭제</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      이 댓글을 삭제하시겠습니까?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>취소</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => {
                                        deleteReply(selectedPost.id, reply.id);
                                        setShowPostDialog(false);
                                      }}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      삭제
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </div>
                        <p className="text-slate-200 whitespace-pre-wrap">{reply.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Mode Warning Dialog */}
        <AlertDialog open={showDeleteModeWarning} onOpenChange={setShowDeleteModeWarning}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-amber-400">
                <AlertTriangle className="w-5 h-5" />
                삭제 관리 모드 활성화
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="text-xl">⚠️</span>
                    <div className="space-y-2">
                      <div className="text-slate-200">
                        삭제 관리 모드를 켜면 기존 댓글, 평가, 사진 등을 삭제할 수 있게 됩니다.
                      </div>
                      <div className="text-red-400 font-medium">
                        삭제 후엔 작업은 되돌릴 수 없습니다.
                      </div>
                      <div className="text-slate-300">
                        계속하시겠습니까?
                      </div>
                    </div>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteMode}
                className="bg-red-600 hover:bg-red-700"
              >
                삭제 관리 모드 활성화
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};