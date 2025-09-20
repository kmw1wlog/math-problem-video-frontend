import React, { useState, useEffect } from 'react';
import { User, Database, Shield, X, LogIn, LogOut, MessageSquare } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { AuthModal } from './auth-modal';
import { AccountManagement } from './account-management';
import { StorageSection } from './storage-section';
import { AdminPanelEnhanced } from './admin-panel-enhanced';
import { authManager, User as AuthUser } from '../utils/auth';

interface SettingsMenuProps {
  onClose: () => void;
  onNavigateToCommunity?: () => void;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({ onClose, onNavigateToCommunity }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState<'main' | 'account' | 'storage' | 'admin'>('main');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setCurrentUser(authManager.getCurrentUser());
    setIsLoading(false);

    const unsubscribe = authManager.onAuthChange((user) => {
      setCurrentUser(user);
    });

    return unsubscribe;
  }, []);

  const handleLogin = (userData: { id: string; name: string; email: string }, token?: string) => {
    const user: AuthUser = {
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
    setSelectedMenu('main');
  };

  const handleStorageClick = () => {
    if (!currentUser) {
      setShowAuthModal(true);
    } else {
      setSelectedMenu('storage');
    }
  };

  const handleAdminClick = () => {
    if (!currentUser?.isAdmin) {
      return; // 관리자가 아니면 접근 불가
    }
    setSelectedMenu('admin');
  };

  if (selectedMenu === 'account' && currentUser) {
    return <AccountManagement user={currentUser} onBack={() => setSelectedMenu('main')} onClose={onClose} />;
  }

  if (selectedMenu === 'storage') {
    return <StorageSection user={currentUser} onBack={() => setSelectedMenu('main')} onClose={onClose} />;
  }

  if (selectedMenu === 'admin' && currentUser?.isAdmin) {
    return <AdminPanelEnhanced onClose={onClose} />;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm">
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-card/95 backdrop-blur-lg border-purple-500/30 max-h-[90vh] overflow-hidden">
          <div className="p-6 space-y-6 h-full overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">설정</h2>
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

            {/* User Info */}
            <div className="space-y-3">
              {currentUser ? (
                <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">{currentUser.name || '사용자'}</p>
                    <p className="text-slate-400 text-sm">{currentUser.email}</p>
                  </div>
                  <Button
                    onClick={handleLogout}
                    variant="ghost"
                    size="sm"
                    className="text-slate-400 hover:text-red-400"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="text-center space-y-3">
                  <p className="text-slate-300">로그인이 필요합니다</p>
                  <Button
                    onClick={() => setShowAuthModal(true)}
                    className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    로그인
                  </Button>
                </div>
              )}
            </div>

            <Separator className="bg-slate-600" />

            {/* Menu Items */}
            <div className="space-y-2">
              {/* Account Management */}
              <Button
                onClick={() => currentUser ? setSelectedMenu('account') : setShowAuthModal(true)}
                variant="ghost"
                className="w-full justify-start text-left p-4 h-auto hover:bg-slate-800/50"
                disabled={!currentUser}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">내 계정 관리</p>
                    <p className="text-slate-400 text-sm">계정 정보 및 설정 관리</p>
                  </div>
                </div>
              </Button>

              {/* Storage */}
              <Button
                onClick={handleStorageClick}
                variant="ghost"
                className="w-full justify-start text-left p-4 h-auto hover:bg-slate-800/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                    <Database className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">저장소</p>
                    <p className="text-slate-400 text-sm">
                      {currentUser ? '내 문제 이력 및 영상 관리' : '로그인 후 이용 가능'}
                    </p>
                  </div>
                </div>
              </Button>

              {/* Community */}
              <Button
                onClick={() => {
                  onNavigateToCommunity?.();
                  onClose();
                }}
                variant="ghost"
                className="w-full justify-start text-left p-4 h-auto hover:bg-slate-800/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">커뮤니티</p>
                    <p className="text-slate-400 text-sm">게시글 및 토론 참여</p>
                  </div>
                </div>
              </Button>

              {/* Admin Mode */}
              {currentUser?.isAdmin && (
                <Button
                  onClick={handleAdminClick}
                  variant="ghost"
                  className="w-full justify-start text-left p-4 h-auto hover:bg-slate-800/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg flex items-center justify-center">
                      <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">관리자 모드</p>
                      <p className="text-slate-400 text-sm">시스템 관리 및 통계</p>
                    </div>
                  </div>
                </Button>
              )}
            </div>

            {/* Version Info */}
            <div className="text-center text-xs text-slate-500">
              Manion v1.0.0
            </div>
          </div>
        </Card>
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onLogin={handleLogin}
        />
      )}
    </div>
  );
};