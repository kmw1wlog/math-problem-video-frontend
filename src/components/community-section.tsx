import React, { useState, useEffect } from 'react';
import { MessageSquare, ThumbsUp, ThumbsDown, Send, Users, Reply, LogIn, LogOut, Eye, EyeOff, Megaphone, Star, RefreshCw } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { AuthModal } from './auth-modal';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { authManager, User } from '../utils/auth';

interface Post {
  id: string;
  content: string;
  author: string;
  createdAt: string;
  likes: number;
  dislikes: number;
  replies: Reply[];
  boardType: 'general' | 'anonymous' | 'notice';
  isNotice?: boolean;
}

interface Reply {
  id: string;
  content: string;
  author: string;
  createdAt: string;
  isAdmin: boolean;
}

export const CommunitySection: React.FC = () => {
  const [generalPosts, setGeneralPosts] = useState<Post[]>([]);
  const [anonymousPosts, setAnonymousPosts] = useState<Post[]>([]);
  const [noticePosts, setNoticePosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [replyContent, setReplyContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStates, setLoadingStates] = useState({
    notice: true,
    general: true,
    anonymous: true
  });
  const [currentTab, setCurrentTab] = useState<'notice' | 'general' | 'anonymous'>('notice');
  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    // Load posts with some delay between requests to avoid overwhelming the server
    const loadPosts = async () => {
      setLoadingStates({ notice: true, general: true, anonymous: true });
      
      // Load notice posts first
      await fetchPosts('notice');
      
      // Small delay before loading general posts
      setTimeout(async () => {
        await fetchPosts('general');
      }, 200);
      
      // Small delay before loading anonymous posts
      setTimeout(async () => {
        await fetchPosts('anonymous');
      }, 400);
    };

    loadPosts();
    
    // Set current user and listen for auth changes
    setUser(authManager.getCurrentUser());
    const unsubscribe = authManager.onAuthChange((user) => {
      setUser(user);
    });

    return unsubscribe;
  }, []);

  const fetchPosts = async (boardType: 'notice' | 'general' | 'anonymous') => {
    try {
      setLoadingStates(prev => ({ ...prev, [boardType]: true }));
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // Reduced to 5 second timeout

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3a80e39f/community/posts/${boardType}`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const postsData = await response.json();
        if (boardType === 'notice') {
          setNoticePosts(postsData);
        } else if (boardType === 'general') {
          setGeneralPosts(postsData);
        } else {
          setAnonymousPosts(postsData);
        }
      } else {
        console.error(`Failed to fetch ${boardType} posts:`, response.status, response.statusText);
        // Set empty array on error to prevent infinite loading
        if (boardType === 'notice') {
          setNoticePosts([]);
        } else if (boardType === 'general') {
          setGeneralPosts([]);
        } else {
          setAnonymousPosts([]);
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error(`Fetch ${boardType} posts timed out`);
        // Don't show toast for timeout on initial load, just set empty array
        if (boardType === 'notice') {
          setNoticePosts([]);
        } else if (boardType === 'general') {
          setGeneralPosts([]);
        } else {
          setAnonymousPosts([]);
        }
      } else {
        console.error(`Error fetching ${boardType} posts:`, error);
        // Set empty array on error to prevent infinite loading
        if (boardType === 'notice') {
          setNoticePosts([]);
        } else if (boardType === 'general') {
          setGeneralPosts([]);
        } else {
          setAnonymousPosts([]);
        }
      }
    } finally {
      setLoadingStates(prev => ({ ...prev, [boardType]: false }));
      
      // Update main loading state when all boards are loaded
      setLoadingStates(currentStates => {
        const allLoaded = !currentStates.notice && !currentStates.general && !currentStates.anonymous;
        if (allLoaded) {
          setLoading(false);
        }
        return currentStates;
      });
    }
  };

  const handleLogin = (userData: { id: string; name: string; email: string }, token?: string) => {
    const user: User = {
      ...userData,
      isAdmin: userData.email === 'manionadmin@manion.com'
    };
    if (token) {
      authManager.setAuthData(user, token);
    } else {
      authManager.setUser(user);
    }
    setShowAuthModal(false);
  };

  const handleLogout = async () => {
    await authManager.signOut();
    toast.success('로그아웃되었습니다.');
  };

  const handleCreatePost = async () => {
    if (!newPost.trim()) {
      toast.error('내용을 입력해주세요.');
      return;
    }

    if (newPost.length > 200) {
      toast.error('게시글은 200자 이내로 작성해주세요.');
      return;
    }

    // 공지사항은 관리자만 작성 가능
    if (currentTab === 'notice' && (!user || user.email !== 'manionadmin@manion.com')) {
      toast.error('공지사항은 관리자만 작성할 수 있습니다.');
      return;
    }

    // 일반 게시판은 로그인 필요
    if (currentTab === 'general' && !user) {
      toast.error('일반 게시판에 글을 작성하려면 로그인이 필요합니다.');
      setShowAuthModal(true);
      return;
    }

    // 익명 게시판은 이름 필요 없음 (자동으로 '익명'으로 설정)

    try {
      const postData = {
        content: newPost,
        author: currentTab === 'notice' ? '관리자' : (currentTab === 'general' ? user!.name : '익명'),
        boardType: currentTab,
        userId: currentTab === 'general' || currentTab === 'notice' ? user!.id : null,
        isNotice: currentTab === 'notice',
      };

      const accessToken = authManager.getAccessToken();
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3a80e39f/community/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken || publicAnonKey}`,
        },
        body: JSON.stringify(postData),
      });

      if (response.ok) {
        setNewPost('');
        setAuthorName('');
        toast.success('게시글이 작성되었습니다!');
        fetchPosts(currentTab);
      } else {
        toast.error('게시글 작성에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('게시글 작성 중 오류가 발생했습니다.');
    }
  };

  const handleLike = async (postId: string, action: 'like' | 'dislike') => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3a80e39f/community/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        fetchPosts(currentTab);
      }
    } catch (error) {
      console.error('Error updating like:', error);
    }
  };

  const handleReply = async (postId: string) => {
    if (!replyContent.trim()) {
      toast.error('답글 내용을 입력해주세요.');
      return;
    }

    if (replyContent.length > 200) {
      toast.error('답글은 200자 이내로 작성해주세요.');
      return;
    }

    // 공지사항과 일반 게시판 댓글은 로그인 필요
    if ((currentTab === 'notice' || currentTab === 'general') && !user) {
      toast.error(`${currentTab === 'notice' ? '공지사항' : '일반 게시판'}에 댓글을 작성하려면 로그인이 필요합니다.`);
      setShowAuthModal(true);
      return;
    }

    try {
      const replyData = {
        content: replyContent,
        author: currentTab === 'anonymous' ? '익명' : user!.name,
        isAdmin: user?.email === 'manionadmin@manion.com',
        userId: currentTab === 'anonymous' ? null : user!.id,
      };

      const accessToken = authManager.getAccessToken();
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3a80e39f/community/posts/${postId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken || publicAnonKey}`,
        },
        body: JSON.stringify(replyData),
      });

      if (response.ok) {
        setReplyContent('');
        setReplyingTo(null);
        toast.success('답글이 작성되었습니다!');
        fetchPosts(currentTab);
      } else {
        toast.error('답글 작성에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error creating reply:', error);
      toast.error('답글 작성 중 오류가 발생했습니다.');
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

  const currentPosts = currentTab === 'notice' ? noticePosts : (currentTab === 'general' ? generalPosts : anonymousPosts);

  const renderPostForm = () => (
    <Card className="border-green-500/30 bg-card/50 backdrop-blur-lg">
      <div className="p-6 space-y-4">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2">
          {currentTab === 'notice' ? (
            <>
              <Megaphone className="w-5 h-5" />
              공지사항 작성
            </>
          ) : (
            <>
              <MessageSquare className="w-5 h-5" />
              {currentTab === 'general' ? '일반 게시글 작성' : '익명 게시글 작성'}
            </>
          )}
        </h3>
        


        {currentTab === 'general' && !user && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <p className="text-blue-300 text-sm">
              일반 게시판에 글을 작성하려면 로그인이 필요합니다.
            </p>
            <Button
              size="sm"
              onClick={() => setShowAuthModal(true)}
              className="mt-2 bg-blue-500 hover:bg-blue-600"
            >
              <LogIn className="w-4 h-4 mr-2" />
              로그인하기
            </Button>
          </div>
        )}

        {(currentTab === 'anonymous' || (currentTab === 'general' && user) || (currentTab === 'notice' && user?.email === 'manionadmin@manion.com')) && (
          <>
            {currentTab === 'notice' && user?.email === 'manionadmin@manion.com' && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <p className="text-red-300 text-sm">
                  <strong>관리자</strong>로 공지사항을 작성합니다
                </p>
              </div>
            )}

            {currentTab === 'general' && user && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <p className="text-green-300 text-sm">
                  <strong>{user.name}</strong>님으로 로그인 중
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Textarea
                placeholder="의견을 자유롭게 남겨주세요..."
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                rows={4}
                className="bg-input border-slate-600"
                maxLength={200}
              />
              <div className="flex justify-end">
                <span className={`text-sm ${newPost.length > 180 ? 'text-red-400' : 'text-slate-400'}`}>
                  {newPost.length}/200자
                </span>
              </div>
            </div>
            
            <Button
              onClick={handleCreatePost}
              className={currentTab === 'notice' 
                ? "bg-gradient-to-r from-red-500 to-purple-500 hover:from-red-600 hover:to-purple-600"
                : "bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
              }
            >
              {currentTab === 'notice' ? (
                <>
                  <Megaphone className="w-4 h-4 mr-2" />
                  공지사항 작성
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  게시글 작성
                </>
              )}
            </Button>
          </>
        )}
      </div>
    </Card>
  );

  const renderPosts = () => {
    const isCurrentTabLoading = loadingStates[currentTab];
    
    return (
      <div className="space-y-6">
        {isCurrentTabLoading ? (
          <div className="text-center text-slate-400 py-8">
            {currentTab === 'notice' ? '공지사항' : currentTab === 'general' ? '일반 게시글' : '익명 게시글'}을 불러오는 중...
          </div>
        ) : currentPosts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-400">
              아직 게시글이 없습니다.
            </p>
          </div>
        ) : (
          currentPosts.map((post) => (
            <Card key={post.id} className={`border-slate-600/30 bg-card/50 backdrop-blur-lg ${post.isNotice ? 'border-red-500/30 bg-red-900/10' : ''}`}>
              <div className="p-6 space-y-4">
                {/* Post Header */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    {post.isNotice && (
                      <Star className="w-4 h-4 text-red-400" />
                    )}
                    <h4 className={`font-semibold ${post.isNotice ? 'text-red-300' : 'text-white'}`}>{post.author}</h4>
                    {currentTab === 'notice' && (
                      <Badge variant="secondary" className="text-xs bg-red-500/20 text-red-300">
                        <Megaphone className="w-3 h-3 mr-1" />
                        공지
                      </Badge>
                    )}
                    {currentTab === 'anonymous' && (
                      <Badge variant="secondary" className="text-xs bg-orange-500/20 text-orange-300">
                        <EyeOff className="w-3 h-3 mr-1" />
                        익명
                      </Badge>
                    )}
                    {currentTab === 'general' && (
                      <Badge variant="secondary" className="text-xs bg-blue-500/20 text-blue-300">
                        <Eye className="w-3 h-3 mr-1" />
                        일반
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-400">{formatDate(post.createdAt)}</p>
                </div>

                {/* Post Content */}
                <p className={`whitespace-pre-wrap ${post.isNotice ? 'text-red-100 font-medium' : 'text-slate-200'}`}>{post.content}</p>

                {/* Post Actions */}
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleLike(post.id, 'like')}
                    className="text-slate-400 hover:text-green-400"
                  >
                    <ThumbsUp className="w-4 h-4 mr-1" />
                    {post.likes || 0}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleLike(post.id, 'dislike')}
                    className="text-slate-400 hover:text-red-400"
                  >
                    <ThumbsDown className="w-4 h-4 mr-1" />
                    {post.dislikes || 0}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if ((currentTab === 'general' || currentTab === 'notice') && !user) {
                        toast.error(`${currentTab === 'notice' ? '공지사항' : '일반 게시판'}에 댓글을 작성하려면 로그인이 필요합니다.`);
                        setShowAuthModal(true);
                        return;
                      }
                      setReplyingTo(replyingTo === post.id ? null : post.id);
                    }}
                    className="text-slate-400 hover:text-blue-400"
                  >
                    <Reply className="w-4 h-4 mr-1" />
                    답글 ({post.replies?.length || 0})
                  </Button>
                </div>

                {/* Replies */}
                {post.replies && post.replies.length > 0 && (
                  <div className="ml-6 space-y-3 border-l-2 border-slate-600 pl-4">
                    {post.replies.map((reply) => (
                      <div key={reply.id} className="bg-slate-800/30 rounded-lg p-4">
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
                )}

                {/* Reply Form */}
                {replyingTo === post.id && (
                  <div className="ml-6 space-y-3 border-l-2 border-blue-500 pl-4">
                    <p className="text-sm text-blue-300">
                      {currentTab === 'anonymous' ? '익명 답글 작성' : `${user!.name}님의 답글`}
                    </p>
                    <div className="space-y-2">
                      <Textarea
                        placeholder="답글을 입력하세요..."
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        rows={3}
                        className="bg-input border-slate-600"
                        maxLength={200}
                      />
                      <div className="flex justify-end">
                        <span className={`text-sm ${replyContent.length > 180 ? 'text-red-400' : 'text-slate-400'}`}>
                          {replyContent.length}/200자
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleReply(post.id)}
                        className="bg-blue-500 hover:bg-blue-600"
                      >
                        답글 작성
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setReplyingTo(null);
                          setReplyContent('');
                        }}
                      >
                        취소
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    );
  };

  return (
    <section className="min-h-screen py-16 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center">
              <Users className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-white">커뮤니티</h2>
          <p className="text-slate-300">Manion 사용자들과 의견을 나누어보세요</p>
          
          {/* User Status */}
          <div className="flex justify-center">
            {user ? (
              <div className="flex items-center gap-4 bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-2">
                <span className="text-green-300 text-sm">
                  <strong>{user.name}</strong>님 환영합니다!
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleLogout}
                  className="text-red-400 hover:text-red-300"
                >
                  <LogOut className="w-4 h-4 mr-1" />
                  로그아웃
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => setShowAuthModal(true)}
                variant="outline"
                className="border-blue-500/50 text-blue-300 hover:bg-blue-500/10"
              >
                <LogIn className="w-4 h-4 mr-2" />
                로그인
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          value={currentTab}
          onValueChange={(value) => setCurrentTab(value as 'notice' | 'general' | 'anonymous')}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3 bg-slate-800/50 border border-slate-600">
            <TabsTrigger
              value="notice"
              className="flex items-center gap-2 data-[state=active]:bg-red-500/20 data-[state=active]:text-red-300"
            >
              <Megaphone className="w-4 h-4" />
              공지사항
            </TabsTrigger>
            <TabsTrigger
              value="general"
              className="flex items-center gap-2 data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-300"
            >
              <Eye className="w-4 h-4" />
              일반 게시판
            </TabsTrigger>
            <TabsTrigger
              value="anonymous"
              className="flex items-center gap-2 data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-300"
            >
              <EyeOff className="w-4 h-4" />
              익명 게시판
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notice" className="space-y-6 mt-6">
            {renderPostForm()}
            {renderPosts()}
          </TabsContent>

          <TabsContent value="general" className="space-y-6 mt-6">
            <div className="text-center bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <p className="text-blue-300 text-sm">
                일반 게시판은 로그인한 사용자만 글과 댓글을 작성할 수 있습니다.
              </p>
            </div>
            {renderPostForm()}
            {renderPosts()}
          </TabsContent>

          <TabsContent value="anonymous" className="space-y-6 mt-6">
            <div className="text-center bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
              <p className="text-orange-300 text-sm">
                익명 게시판은 로그인 없이 누구나 글과 댓글을 작성할 수 있습니다. 모든 게시글과 댓글은 '익명'으로 표시됩니다.
              </p>
            </div>
            {renderPostForm()}
            {renderPosts()}
          </TabsContent>
        </Tabs>

        {/* Auth Modal */}
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onLogin={handleLogin}
        />
      </div>
    </section>
  );
};