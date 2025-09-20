import React, { useState, useEffect } from 'react';
import { Shield, FileImage, Calendar, User, Eye, BarChart3, Activity, MessageSquare, EyeOff, Users, Star, ThumbsUp } from 'lucide-react';
import { EvaluationTab } from './admin-panel-evaluations';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { projectId, publicAnonKey } from '../utils/supabase/info';

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

interface AdminPanelProps {
  onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [generalPosts, setGeneralPosts] = useState<Post[]>([]);
  const [anonymousPosts, setAnonymousPosts] = useState<Post[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [evaluationsLoading, setEvaluationsLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null);
  const [showPostDialog, setShowPostDialog] = useState(false);
  const [showEvaluationDialog, setShowEvaluationDialog] = useState(false);
  const [stats, setStats] = useState({
    totalProblems: 0,
    completedProblems: 0,
    processingProblems: 0,
    failedProblems: 0,
  });
  const [postStats, setPostStats] = useState({
    totalPosts: 0,
    generalPosts: 0,
    anonymousPosts: 0,
    totalReplies: 0,
  });
  const [evaluationStats, setEvaluationStats] = useState({
    totalEvaluations: 0,
    averageRating: 0,
    ratingDistribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
  });

  useEffect(() => {
    fetchProblems();
    fetchPosts();
    fetchEvaluations();
  }, []);

  const fetchProblems = async () => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3a80e39f/admin/problems`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });
      
      if (response.ok) {
        const problemsData = await response.json();
        setProblems(problemsData);
        
        // Calculate stats
        const total = problemsData.length;
        const completed = problemsData.filter((p: Problem) => p.status === 'completed').length;
        const processing = problemsData.filter((p: Problem) => p.status === 'processing').length;
        const failed = problemsData.filter((p: Problem) => p.status === 'failed').length;
        
        setStats({
          totalProblems: total,
          completedProblems: completed,
          processingProblems: processing,
          failedProblems: failed,
        });
      }
    } catch (error) {
      console.error('Error fetching problems:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async () => {
    try {
      setPostsLoading(true);
      
      // Fetch general posts
      const generalResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3a80e39f/community/posts/general`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });
      
      // Fetch anonymous posts
      const anonymousResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3a80e39f/community/posts/anonymous`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });
      
      if (generalResponse.ok && anonymousResponse.ok) {
        const generalData = await generalResponse.json();
        const anonymousData = await anonymousResponse.json();
        
        setGeneralPosts(generalData);
        setAnonymousPosts(anonymousData);
        
        // Calculate post stats
        const totalGeneral = generalData.length;
        const totalAnonymous = anonymousData.length;
        const totalPosts = totalGeneral + totalAnonymous;
        const totalReplies = [...generalData, ...anonymousData].reduce((sum, post) => sum + (post.replies?.length || 0), 0);
        
        setPostStats({
          totalPosts,
          generalPosts: totalGeneral,
          anonymousPosts: totalAnonymous,
          totalReplies,
        });
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setPostsLoading(false);
    }
  };

  const fetchEvaluations = async () => {
    try {
      setEvaluationsLoading(true);
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3a80e39f/admin/evaluations`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });
      
      if (response.ok) {
        const evaluationsData = await response.json();
        setEvaluations(evaluationsData);
        
        // Calculate evaluation stats
        const total = evaluationsData.length;
        let totalRating = 0;
        const distribution = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
        
        evaluationsData.forEach((evaluation: Evaluation) => {
          totalRating += evaluation.rating;
          distribution[evaluation.rating as keyof typeof distribution]++;
        });
        
        const average = total > 0 ? Math.round((totalRating / total) * 10) / 10 : 0;
        
        setEvaluationStats({
          totalEvaluations: total,
          averageRating: average,
          ratingDistribution: distribution,
        });
      }
    } catch (error) {
      console.error('Error fetching evaluations:', error);
    } finally {
      setEvaluationsLoading(false);
    }
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

  const getSuccessRate = () => {
    if (stats.totalProblems === 0) return 0;
    return Math.round((stats.completedProblems / stats.totalProblems) * 100);
  };

  const handleViewPost = (post: Post) => {
    setSelectedPost(post);
    setShowPostDialog(true);
  };

  const handleViewEvaluation = (evaluation: Evaluation) => {
    setSelectedEvaluation(evaluation);
    setShowEvaluationDialog(true);
  };

  const truncateText = (text: string, maxLength: number = 50) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
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
              <h1 className="text-3xl font-bold text-white">관리자 패널</h1>
              <p className="text-slate-300">Manion 시스템 관리 및 모니터링</p>
            </div>
          </div>
          <Button
            onClick={onClose}
            variant="outline"
            className="border-slate-600"
          >
            메인으로 돌아가기
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card className="border-blue-500/30 bg-card/50 backdrop-blur-lg">
            <div className="p-6 space-y-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-400" />
                <span className="text-slate-300">총 문제 수</span>
              </div>
              <p className="text-3xl font-bold text-white">{stats.totalProblems}</p>
            </div>
          </Card>

          <Card className="border-green-500/30 bg-card/50 backdrop-blur-lg">
            <div className="p-6 space-y-2">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-400" />
                <span className="text-slate-300">완료된 문제</span>
              </div>
              <p className="text-3xl font-bold text-white">{stats.completedProblems}</p>
            </div>
          </Card>

          <Card className="border-yellow-500/30 bg-card/50 backdrop-blur-lg">
            <div className="p-6 space-y-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-yellow-400" />
                <span className="text-slate-300">총 게시글</span>
              </div>
              <p className="text-3xl font-bold text-white">{postStats.totalPosts}</p>
            </div>
          </Card>

          <Card className="border-purple-500/30 bg-card/50 backdrop-blur-lg">
            <div className="p-6 space-y-2">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                <span className="text-slate-300">총 댓글</span>
              </div>
              <p className="text-3xl font-bold text-white">{postStats.totalReplies}</p>
            </div>
          </Card>

          <Card className="border-orange-500/30 bg-card/50 backdrop-blur-lg">
            <div className="p-6 space-y-2">
              <div className="flex items-center gap-2">
                <ThumbsUp className="w-5 h-5 text-orange-400" />
                <span className="text-slate-300">영상 평가</span>
              </div>
              <p className="text-3xl font-bold text-white">{evaluationStats.totalEvaluations}</p>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                <span className="text-sm text-slate-400">{evaluationStats.averageRating}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="problems" className="space-y-6">
          <TabsList className="bg-card/50 backdrop-blur-lg border border-slate-600">
            <TabsTrigger value="problems" className="data-[state=active]:bg-purple-500/20">
              문제 관리
            </TabsTrigger>
            <TabsTrigger value="community" className="data-[state=active]:bg-purple-500/20">
              게시판 관리
            </TabsTrigger>
            <TabsTrigger value="evaluations" className="data-[state=active]:bg-purple-500/20">
              평가 관리
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-purple-500/20">
              통계 분석
            </TabsTrigger>
          </TabsList>

          <TabsContent value="problems" className="space-y-6">
            <Card className="border-slate-600/30 bg-card/50 backdrop-blur-lg">
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-white">업로드된 문제 목록</h2>
                  <Button
                    onClick={fetchProblems}
                    size="sm"
                    variant="outline"
                    className="border-slate-600"
                  >
                    새로고침
                  </Button>
                </div>

                {loading ? (
                  <div className="text-center text-slate-400 py-8">
                    데이터를 불러오는 중...
                  </div>
                ) : problems.length === 0 ? (
                  <div className="text-center text-slate-400 py-8">
                    아직 업로드된 문제가 없습니다.
                  </div>
                ) : (
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
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="community" className="space-y-6">
            {/* Community Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-blue-500/30 bg-card/50 backdrop-blur-lg">
                <div className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-400" />
                    <span className="text-slate-300 text-sm">전체 게시글</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{postStats.totalPosts}</p>
                </div>
              </Card>
              
              <Card className="border-blue-500/30 bg-card/50 backdrop-blur-lg">
                <div className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-blue-400" />
                    <span className="text-slate-300 text-sm">일반 게시글</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{postStats.generalPosts}</p>
                </div>
              </Card>
              
              <Card className="border-orange-500/30 bg-card/50 backdrop-blur-lg">
                <div className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <EyeOff className="w-4 h-4 text-orange-400" />
                    <span className="text-slate-300 text-sm">익명 게시글</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{postStats.anonymousPosts}</p>
                </div>
              </Card>
              
              <Card className="border-green-500/30 bg-card/50 backdrop-blur-lg">
                <div className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-green-400" />
                    <span className="text-slate-300 text-sm">전체 댓글</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{postStats.totalReplies}</p>
                </div>
              </Card>
            </div>

            {/* Posts Management */}
            <Tabs defaultValue="all" className="space-y-4">
              <TabsList className="bg-card/50 backdrop-blur-lg border border-slate-600">
                <TabsTrigger value="all" className="data-[state=active]:bg-slate-500/20">
                  전체 게시글
                </TabsTrigger>
                <TabsTrigger value="general" className="data-[state=active]:bg-blue-500/20">
                  일반 게시판
                </TabsTrigger>
                <TabsTrigger value="anonymous" className="data-[state=active]:bg-orange-500/20">
                  익명 게시판
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-4">
                <Card className="border-slate-600/30 bg-card/50 backdrop-blur-lg">
                  <div className="p-6 space-y-4">
                    <div className="flex justify-between items-center">
                      <h2 className="text-xl font-semibold text-white">전체 게시글 관리</h2>
                      <Button
                        onClick={fetchPosts}
                        size="sm"
                        variant="outline"
                        className="border-slate-600"
                      >
                        새로고침
                      </Button>
                    </div>

                    {postsLoading ? (
                      <div className="text-center text-slate-400 py-8">
                        데이터를 불러오는 중...
                      </div>
                    ) : [...generalPosts, ...anonymousPosts].length === 0 ? (
                      <div className="text-center text-slate-400 py-8">
                        아직 게시글이 없습니다.
                      </div>
                    ) : (
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
                                    onClick={() => handleViewPost(post)}
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
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleViewPost(post)}
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
              </TabsContent>

              <TabsContent value="general" className="space-y-4">
                <Card className="border-slate-600/30 bg-card/50 backdrop-blur-lg">
                  <div className="p-6 space-y-4">
                    <div className="flex justify-between items-center">
                      <h2 className="text-xl font-semibold text-white">일반 게시판 관리</h2>
                      <Button
                        onClick={fetchPosts}
                        size="sm"
                        variant="outline"
                        className="border-slate-600"
                      >
                        새로고침
                      </Button>
                    </div>

                    {postsLoading ? (
                      <div className="text-center text-slate-400 py-8">
                        데이터를 불러오는 중...
                      </div>
                    ) : generalPosts.length === 0 ? (
                      <div className="text-center text-slate-400 py-8">
                        아직 일반 게시글이 없습니다.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-slate-600">
                              <TableHead className="text-slate-300">작성자</TableHead>
                              <TableHead className="text-slate-300">내용</TableHead>
                              <TableHead className="text-slate-300">작성시간</TableHead>
                              <TableHead className="text-slate-300">좋아요/싫어요</TableHead>
                              <TableHead className="text-slate-300">댓글</TableHead>
                              <TableHead className="text-slate-300">작업</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {generalPosts.map((post) => (
                              <TableRow key={post.id} className="border-slate-700">
                                <TableCell className="text-slate-300">
                                  {post.author}
                                </TableCell>
                                <TableCell className="text-slate-300 max-w-xs">
                                  <button
                                    onClick={() => handleViewPost(post)}
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
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleViewPost(post)}
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
              </TabsContent>

              <TabsContent value="anonymous" className="space-y-4">
                <Card className="border-slate-600/30 bg-card/50 backdrop-blur-lg">
                  <div className="p-6 space-y-4">
                    <div className="flex justify-between items-center">
                      <h2 className="text-xl font-semibold text-white">익명 게시판 관리</h2>
                      <Button
                        onClick={fetchPosts}
                        size="sm"
                        variant="outline"
                        className="border-slate-600"
                      >
                        새로고침
                      </Button>
                    </div>

                    {postsLoading ? (
                      <div className="text-center text-slate-400 py-8">
                        데이터를 불러오는 중...
                      </div>
                    ) : anonymousPosts.length === 0 ? (
                      <div className="text-center text-slate-400 py-8">
                        아직 익명 게시글이 없습니다.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-slate-600">
                              <TableHead className="text-slate-300">작성자</TableHead>
                              <TableHead className="text-slate-300">내용</TableHead>
                              <TableHead className="text-slate-300">작성시간</TableHead>
                              <TableHead className="text-slate-300">좋아요/싫어요</TableHead>
                              <TableHead className="text-slate-300">댓글</TableHead>
                              <TableHead className="text-slate-300">작업</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {anonymousPosts.map((post) => (
                              <TableRow key={post.id} className="border-slate-700">
                                <TableCell className="text-slate-300">
                                  {post.author}
                                </TableCell>
                                <TableCell className="text-slate-300 max-w-xs">
                                  <button
                                    onClick={() => handleViewPost(post)}
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
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleViewPost(post)}
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
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-slate-600/30 bg-card/50 backdrop-blur-lg">
                <div className="p-6 space-y-4">
                  <h3 className="text-lg font-semibold text-white">처리 상태 분포</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300">완료</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500 transition-all duration-300"
                            style={{ width: `${stats.totalProblems > 0 ? (stats.completedProblems / stats.totalProblems) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="text-sm text-slate-400">{stats.completedProblems}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300">처리중</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-yellow-500 transition-all duration-300"
                            style={{ width: `${stats.totalProblems > 0 ? (stats.processingProblems / stats.totalProblems) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="text-sm text-slate-400">{stats.processingProblems}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300">실패</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-red-500 transition-all duration-300"
                            style={{ width: `${stats.totalProblems > 0 ? (stats.failedProblems / stats.totalProblems) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="text-sm text-slate-400">{stats.failedProblems}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="border-slate-600/30 bg-card/50 backdrop-blur-lg">
                <div className="p-6 space-y-4">
                  <h3 className="text-lg font-semibold text-white">시스템 상태</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300">서버 상태</span>
                      <Badge className="bg-green-500/20 text-green-300">정상</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300">AI 엔진</span>
                      <Badge className="bg-green-500/20 text-green-300">활성</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300">데이터베이스</span>
                      <Badge className="bg-green-500/20 text-green-300">연결됨</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300">스토리지</span>
                      <Badge className="bg-green-500/20 text-green-300">정상</Badge>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Post Detail Dialog */}
        <Dialog open={showPostDialog} onOpenChange={setShowPostDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                게시글 상세 정보
                {selectedPost && getBoardTypeBadge(selectedPost.boardType)}
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                게시글의 상세 내용과 댓글을 확인할 수 있습니다.
              </DialogDescription>
            </DialogHeader>
            
            {selectedPost && (
              <div className="space-y-6 p-2">
                {/* Post Info */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-slate-400">작성자</label>
                      <p className="text-white font-medium">{selectedPost.author}</p>
                    </div>
                    <div>
                      <label className="text-sm text-slate-400">작성시간</label>
                      <p className="text-white">{formatDate(selectedPost.createdAt)}</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm text-slate-400">내용</label>
                    <div className="mt-2 p-4 bg-slate-800/50 rounded-lg border border-slate-600">
                      <p className="text-slate-200 whitespace-pre-wrap">{selectedPost.content}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm text-slate-400">좋아요</label>
                      <p className="text-green-400 font-medium">{selectedPost.likes || 0}</p>
                    </div>
                    <div>
                      <label className="text-sm text-slate-400">싫어요</label>
                      <p className="text-red-400 font-medium">{selectedPost.dislikes || 0}</p>
                    </div>
                    <div>
                      <label className="text-sm text-slate-400">댓글 수</label>
                      <p className="text-blue-400 font-medium">{selectedPost.replies?.length || 0}</p>
                    </div>
                  </div>
                </div>

                {/* Replies */}
                {selectedPost.replies && selectedPost.replies.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      댓글 ({selectedPost.replies.length})
                    </h3>
                    <div className="space-y-3">
                      {selectedPost.replies.map((reply) => (
                        <div key={reply.id} className="bg-slate-800/30 rounded-lg p-4 border border-slate-600">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-white">{reply.author}</span>
                              {reply.isAdmin && (
                                <Badge variant="secondary" className="text-xs bg-purple-500/20 text-purple-300">
                                  관리자
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-slate-400">{formatDate(reply.createdAt)}</span>
                          </div>
                          <p className="text-slate-200 whitespace-pre-wrap">{reply.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};