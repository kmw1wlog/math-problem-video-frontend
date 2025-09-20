import React, { useState, useRef } from 'react';
import { X, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: { id: string; name: string; email: string }, token?: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLogin }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Refs for focus management
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const handleEmailAuth = async () => {
    if (!email || !password || (isSignUp && !name)) {
      toast.error('모든 필드를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout for auth

      if (isSignUp) {
        // Sign up
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3a80e39f/signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            email,
            password,
            name,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const result = await response.json();
        if (response.ok) {
          toast.success('회원가입이 완료되었습니다!');
          setIsSignUp(false);
        } else {
          toast.error(result.error || '회원가입에 실패했습니다.');
        }
      } else {
        // Sign in
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3a80e39f/signin`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            email,
            password,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const result = await response.json();
        if (response.ok) {
          toast.success('로그인되었습니다!');
          onLogin({
            id: result.user.id,
            name: result.user.user_metadata?.name || result.user.email,
            email: result.user.email,
          }, result.session?.access_token);
          onClose();
        } else {
          toast.error(result.error || '로그인에 실패했습니다.');
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('Auth request timed out');
        toast.error('요청 시간이 초과되었습니다. 다시 시도해주세요.');
      } else {
        console.error('Auth error:', error);
        toast.error('오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3a80e39f/auth/google`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      const result = await response.json();
      if (response.ok && result.url) {
        window.open(result.url, '_blank');
        toast.info('팝업에서 Google 로그인을 완료해주세요.');
      } else {
        toast.error('Google 로그인을 시작할 수 없습니다.');
      }
    } catch (error) {
      console.error('Google auth error:', error);
      toast.error('Google 로그인 중 오류가 발생했습니다.');
    }
  };

  const handleKakaoAuth = async () => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3a80e39f/auth/kakao`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      const result = await response.json();
      if (response.ok && result.url) {
        window.open(result.url, '_blank');
        toast.info('팝업에서 카카오 로그인을 완료해주세요.');
      } else {
        toast.error('카카오 로그인을 시작할 수 없습니다.');
      }
    } catch (error) {
      console.error('Kakao auth error:', error);
      toast.error('카카오 로그인 중 오류가 발생했습니다.');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, nextRef?: React.RefObject<HTMLInputElement>) => {
    if (e.key === 'Tab' && !e.shiftKey && nextRef?.current) {
      e.preventDefault();
      nextRef.current.focus();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleEmailAuth();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold text-white">
            {isSignUp ? '회원가입' : '로그인'}
          </DialogTitle>
          <DialogDescription className="text-center text-slate-400">
            {isSignUp 
              ? '새 계정을 생성하여 Manion 커뮤니티에 참여하세요' 
              : '기존 계정으로 Manion에 로그인하세요'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 p-2">
          {/* Email Form */}
          <div className="space-y-4">
            {isSignUp && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                <Input
                  ref={nameRef}
                  type="text"
                  placeholder="이름"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, emailRef)}
                  className="pl-10 pr-4 bg-input border-slate-600 select-text cursor-text"
                  style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
                  tabIndex={1}
                  autoComplete="name"
                />
              </div>
            )}
            
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
              <Input
                ref={emailRef}
                type="email"
                placeholder="이메일"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, passwordRef)}
                className="pl-10 pr-4 bg-input border-slate-600 select-text cursor-text"
                style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
                tabIndex={isSignUp ? 2 : 1}
                autoComplete="email"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
              <Input
                ref={passwordRef}
                type={showPassword ? "text" : "password"}
                placeholder="비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e)}
                className="pl-10 pr-12 bg-input border-slate-600 select-text cursor-text"
                style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
                tabIndex={isSignUp ? 3 : 2}
                autoComplete={isSignUp ? "new-password" : "current-password"}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors z-10"
                tabIndex={-1}
                title={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
              >
                {showPassword ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <EyeOff className="w-4 h-4" />
                )}
              </button>
            </div>

            <Button
              onClick={handleEmailAuth}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
              tabIndex={isSignUp ? 4 : 3}
            >
              {loading ? '처리 중...' : (isSignUp ? '회원가입' : '로그인')}
            </Button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-card text-slate-400">또는</span>
            </div>
          </div>

          {/* Social Login */}
          <div className="space-y-3">
            <Button
              onClick={handleGoogleAuth}
              variant="outline"
              className="w-full border-slate-600 text-white hover:bg-slate-800"
              tabIndex={isSignUp ? 5 : 4}
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google로 로그인
            </Button>

            <Button
              onClick={handleKakaoAuth}
              variant="outline"
              className="w-full border-slate-600 text-white hover:bg-slate-800"
              tabIndex={isSignUp ? 6 : 5}
            >
              <div className="w-4 h-4 mr-2 bg-yellow-400 rounded-full flex items-center justify-center">
                <span className="text-black text-xs font-bold">K</span>
              </div>
              카카오로 로그인
            </Button>
          </div>

          {/* Toggle Sign Up / Sign In */}
          <div className="text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-blue-400 hover:text-blue-300"
              tabIndex={isSignUp ? 7 : 6}
            >
              {isSignUp ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 회원가입'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};