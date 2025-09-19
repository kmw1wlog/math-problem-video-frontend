import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Mail, Calendar, Edit2, Save, X } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { toast } from 'sonner@2.0.3';
import { authManager, User as AuthUser } from '../utils/auth';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface AccountManagementProps {
  user: AuthUser;
  onBack: () => void;
  onClose: () => void;
}

interface UserStats {
  totalProblems: number;
  completedProblems: number;
  totalComments: number;
  totalEvaluations: number;
}

export const AccountManagement: React.FC<AccountManagementProps> = ({ user, onBack, onClose }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(user.name || '');
  const [isLoading, setIsLoading] = useState(false);
  const [userStats, setUserStats] = useState<UserStats>({
    totalProblems: 0,
    completedProblems: 0,
    totalComments: 0,
    totalEvaluations: 0
  });

  useEffect(() => {
    fetchUserStats();
  }, [user.id]);

  const fetchUserStats = async () => {
    try {
      const accessToken = authManager.getAccessToken();
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3a80e39f/user/history`, {
        headers: {
          'Authorization': `Bearer ${accessToken || publicAnonKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  const handleSave = async () => {
    if (!editedName.trim()) {
      toast.error('이름을 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      // API call to update user info
      await new Promise(resolve => setTimeout(resolve, 1000)); // Mock API call
      toast.success('계정 정보가 업데이트되었습니다.');
      setIsEditing(false);
    } catch (error) {
      toast.error('업데이트에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditedName(user.name || '');
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm">
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-card/95 backdrop-blur-lg border-blue-500/30 max-h-[90vh] overflow-hidden">
          <div className="p-6 space-y-6 h-full overflow-y-auto">
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
                <h2 className="text-2xl font-bold text-white">내 계정</h2>
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

            <Separator className="bg-slate-600" />

            {/* Profile Section */}
            <div className="space-y-6">
              {/* Avatar */}
              <div className="flex justify-center">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <User className="w-10 h-10 text-white" />
                </div>
              </div>

              {/* User Info */}
              <div className="space-y-4">
                {/* Name */}
                <div className="space-y-2">
                  <Label className="text-slate-300">이름</Label>
                  {isEditing ? (
                    <Input
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      placeholder="이름을 입력하세요"
                      className="bg-slate-800/50 border-slate-600 text-white"
                    />
                  ) : (
                    <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                      <span className="text-white">{user.name || '이름 없음'}</span>
                      <Button
                        onClick={() => setIsEditing(true)}
                        variant="ghost"
                        size="sm"
                        className="text-slate-400 hover:text-blue-300"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label className="text-slate-300">이메일</Label>
                  <div className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-lg">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span className="text-white">{user.email}</span>
                  </div>
                </div>

                {/* User ID */}
                <div className="space-y-2">
                  <Label className="text-slate-300">사용자 ID</Label>
                  <div className="p-3 bg-slate-800/30 rounded-lg">
                    <span className="text-slate-400 font-mono text-sm">{user.id}</span>
                  </div>
                </div>

                {/* Account Type */}
                <div className="space-y-2">
                  <Label className="text-slate-300">계정 유형</Label>
                  <div className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-lg">
                    {user.isAdmin ? (
                      <>
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span className="text-red-400 font-medium">관리자</span>
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-blue-400 font-medium">일반 사용자</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Join Date */}
                <div className="space-y-2">
                  <Label className="text-slate-300">가입일</Label>
                  <div className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-lg">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="text-white">2024년 1월 15일</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {isEditing && (
                <div className="flex gap-3">
                  <Button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                  >
                    {isLoading ? (
                      <>저장 중...</>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        저장
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleCancel}
                    variant="outline"
                    className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800/50"
                  >
                    취소
                  </Button>
                </div>
              )}
            </div>

            {/* Statistics */}
            <div className="space-y-4">
              <Separator className="bg-slate-600" />
              <h3 className="text-lg font-semibold text-white">활동 통계</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-slate-800/30 rounded-lg">
                  <p className="text-2xl font-bold text-blue-400">{userStats.totalProblems}</p>
                  <p className="text-slate-400 text-sm">업로드한 문제</p>
                </div>
                <div className="text-center p-3 bg-slate-800/30 rounded-lg">
                  <p className="text-2xl font-bold text-green-400">{userStats.completedProblems}</p>
                  <p className="text-slate-400 text-sm">완료된 문제</p>
                </div>
                <div className="text-center p-3 bg-slate-800/30 rounded-lg">
                  <p className="text-2xl font-bold text-purple-400">{userStats.totalComments}</p>
                  <p className="text-slate-400 text-sm">작성한 댓글</p>
                </div>
                <div className="text-center p-3 bg-slate-800/30 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-400">{userStats.totalEvaluations}</p>
                  <p className="text-slate-400 text-sm">작성한 평가</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};