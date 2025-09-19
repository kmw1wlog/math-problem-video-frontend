import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileImage, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { authManager } from '../utils/auth';

interface UploadSectionProps {
  onUploadSuccess: (problemId: string) => void;
}

export const UploadSection: React.FC<UploadSectionProps> = ({ onUploadSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [problemTitle, setProblemTitle] = useState('');
  const [currentUser, setCurrentUser] = useState(authManager.getCurrentUser());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Listen for auth changes
  useEffect(() => {
    const unsubscribe = authManager.onAuthChange((user) => {
      setCurrentUser(user);
    });

    return unsubscribe;
  }, []);



  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Validate file type - only allow specific formats
    const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!supportedTypes.includes(file.type.toLowerCase())) {
      toast.error('지원되지 않는 파일 형식입니다. JPG, PNG, JPEG 파일만 업로드 가능합니다.');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('파일 크기는 10MB를 초과할 수 없습니다.');
      return;
    }

    setUploading(true);

    try {
      // Generate default title with current date and time if user is logged in
      let defaultTitle = `수학 문제 ${new Date().toLocaleDateString()}`;
      if (currentUser) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hour = String(now.getHours()).padStart(2, '0');
        const minute = String(now.getMinutes()).padStart(2, '0');
        defaultTitle = `${year}/${month}/${day}/ ${hour}:${minute}`;
      }
      
      const formData = new FormData();
      formData.append('image', file);
      formData.append('title', problemTitle.trim() || defaultTitle);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout for upload

      const accessToken = authManager.getAccessToken();
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3a80e39f/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken || publicAnonKey}`,
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const result = await response.json();

      if (response.ok) {
        toast.success('수학 문제가 성공적으로 업로드되었습니다!');
        setProblemTitle(''); // Clear title after successful upload
        onUploadSuccess(result.problemId);
      } else {
        toast.error(result.error || '업로드 중 오류가 발생했습니다.');
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('Upload request timed out');
        toast.error('업로드 시간이 초과되었습니다. 다시 시도해주세요.');
      } else {
        console.error('Upload error:', error);
        toast.error('업로드 중 오류가 발생했습니다.');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  return (
    <section className="min-h-screen flex flex-col justify-center px-4">
      <div className="flex-1 flex items-center justify-center" style={{ paddingTop: '15vh', paddingBottom: '15vh' }}>
        <div className="max-w-2xl w-full space-y-4 md:space-y-6">
          {/* Hero Section */}
          <div className="text-center space-y-4 md:space-y-6">
            <div className="space-y-2 md:space-y-2">
              <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                Manion
              </h1>
            </div>
            
            <div className="space-y-3 md:space-y-4">
              <h2 className="text-xl md:text-2xl font-semibold text-white">
                수학문제를 풀이영상으로 바꾸세요
              </h2>
              <p className="text-base md:text-base text-slate-300">
                사진을 업로드하면 AI가 단계별 풀이 영상을 생성합니다
              </p>
              <p className="text-sm md:text-sm text-yellow-300 font-medium">
                *현재 중학수학수준의 문제만 가능합니다.
              </p>
            </div>
          </div>

          {/* Upload Card */}
          <Card className="border-purple-500/30 bg-card/50 backdrop-blur-lg">
            <div className="p-6 md:p-8 space-y-5 md:space-y-6">
            {/* Problem Title Input */}
            {currentUser && (
              <div className="space-y-2">
                <Label htmlFor="problemTitle" className="text-white">
                  문제 제목 (선택사항)
                </Label>
                <Input
                  id="problemTitle"
                  type="text"
                  placeholder="예: 2차 방정식 문제"
                  value={problemTitle}
                  onChange={(e) => setProblemTitle(e.target.value)}
                  className="bg-slate-800/50 border-slate-600 text-white"
                  maxLength={100}
                />
                <p className="text-xs text-slate-400">
                  로그인 상태에서는 문제 제목을 설정하여 나중에 쉽게 찾을 수 있습니다.
                </p>
              </div>
            )}

              <div
                className={`border-2 border-dashed rounded-lg p-6 md:p-8 text-center transition-all duration-300 ${
                  dragOver
                    ? 'border-purple-400 bg-purple-500/10'
                    : 'border-purple-500/50 hover:border-purple-400'
                } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                onDrop={handleDrop}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
              >
                <div className="space-y-4 md:space-y-6">
                  <div className="flex justify-center">
                    {uploading ? (
                      <Loader2 className="w-14 md:w-16 h-14 md:h-16 text-purple-400 animate-spin" />
                    ) : (
                      <div className="relative">
                        <div className="w-14 md:w-16 h-14 md:h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                          <FileImage className="w-7 md:w-8 h-7 md:h-8 text-white" />
                        </div>
                        <div className="absolute -top-1 md:-top-2 -right-1 md:-right-2 w-5 md:w-6 h-5 md:h-6 bg-gradient-to-br from-pink-500 to-purple-500 rounded-full flex items-center justify-center">
                          <Upload className="w-2.5 md:w-3 h-2.5 md:h-3 text-white" />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 md:space-y-2">
                    <p className="text-lg md:text-lg font-medium text-white">
                      {uploading ? '수학 문제를 분석하고 있습니다...' : '수학 문제 이미지를 업로드하세요'}
                    </p>
                    <p className="text-base md:text-base text-slate-400">
                      {uploading ? '잠시만 기다려주세요' : '파일을 드래그하거나 클릭하여 선택하세요'}
                    </p>
                  </div>

                  <div className="space-y-3 md:space-y-4">
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-medium px-8 md:px-8 py-3 md:py-3 rounded-lg transition-all duration-300 transform hover:scale-105"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          업로드 중...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          파일 선택
                        </>
                      )}
                    </Button>

                    <p className="text-sm md:text-sm text-slate-500">
                      지원 형식: JPG, PNG, JPEG (최대 10MB)
                    </p>

                  </div>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                onChange={handleFileSelect}
                className="hidden"
              />
              
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};