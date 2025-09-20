import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Settings, ChevronDown } from 'lucide-react';
import { Button } from './components/ui/button';
import { Toaster } from './components/ui/sonner';
import { UploadSection } from './components/upload-section';
import { LoadingSection } from './components/loading-section';
import { CommunitySection } from './components/community-section';

import { ResultAnalysisSection } from './components/result-analysis-section';
import { SettingsMenu } from './components/settings-menu';
import { StarsBackground } from './components/stars-background';
import { authManager } from './utils/auth';

export default function App() {
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [currentProblemId, setCurrentProblemId] = useState<string>('');
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const [showAnalysisSection, setShowAnalysisSection] = useState(false);
  const [showCommunitySection, setShowCommunitySection] = useState(false);
  const [currentUser, setCurrentUser] = useState(authManager.getCurrentUser());

  const homeRef = useRef<HTMLDivElement>(null);
  const sloganRef = useRef<HTMLDivElement>(null);
  const communityRef = useRef<HTMLDivElement>(null);


  // Listen for auth changes
  useEffect(() => {
    const unsubscribe = authManager.onAuthChange((user) => {
      setCurrentUser(user);
    });

    return unsubscribe;
  }, []);

  // Define scroll functions first
  const scrollToSection = useCallback((ref: React.RefObject<HTMLDivElement>) => {
    setShowAnalysisSection(false);
    setShowCommunitySection(false);
    requestAnimationFrame(() => {
      ref.current?.scrollIntoView({ behavior: 'smooth' });
    });
  }, []);

  const scrollToSlogan = useCallback(() => {
    setShowAnalysisSection(false);
    setShowCommunitySection(false);
    requestAnimationFrame(() => {
      sloganRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
  }, []);

  // Memoized navigation handlers to prevent re-renders
  const navigationHandlers = useMemo(() => ({
    home: () => scrollToSection(homeRef),
    slogan: () => scrollToSection(sloganRef),
    community: () => {
      setShowAnalysisSection(false);
      setShowCommunitySection(true);
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    },
    analysis: () => {
      setShowCommunitySection(false);
      setShowAnalysisSection(true);
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }), [scrollToSection]);

  const scrollHandlers = useMemo(() => ({
    toSlogan: scrollToSlogan,
    toCommunity: () => scrollToSection(communityRef)
  }), [scrollToSlogan, scrollToSection]);

  const handleUploadSuccess = (problemId: string) => {
    setCurrentProblemId(problemId);
    setIsProcessing(true);
  };

  const handleLoadingComplete = (url: string) => {
    setVideoUrl(url);
    setIsProcessing(false);
    setShowAnalysisSection(true);
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  const handleStartNew = () => {
    setCurrentProblemId('');
    setVideoUrl('');
    setIsProcessing(false);
    setShowAnalysisSection(false);
    setShowCommunitySection(false);
    requestAnimationFrame(() => {
      homeRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
  };

  if (showSettingsMenu) {
    return <SettingsMenu 
      onClose={() => setShowSettingsMenu(false)} 
      onNavigateToCommunity={navigationHandlers.community}
    />;
  }

  // If showing community section, render completely different layout
  if (showCommunitySection) {
    return (
      <div className="relative min-h-screen">
        <StarsBackground />
        
        {/* Navigation for Community Page */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-blue-500/10">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-8">
                <button
                  onClick={navigationHandlers.home}
                  className="text-xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent hover:scale-105 transition-transform"
                >
                  Manion
                </button>
                
                <div className="hidden md:flex gap-6">
                  <button
                    onClick={navigationHandlers.home}
                    className="text-slate-400 hover:text-blue-300 transition-colors"
                  >
                    홈
                  </button>
                  <button
                    onClick={navigationHandlers.slogan}
                    className="text-slate-400 hover:text-blue-300 transition-colors"
                  >
                    소개
                  </button>
                  <button
                    onClick={navigationHandlers.community}
                    className="text-white hover:text-blue-300 transition-colors"
                  >
                    커뮤니티
                  </button>
                  {videoUrl && (
                    <button
                      onClick={navigationHandlers.analysis}
                      className="text-slate-400 hover:text-blue-300 transition-colors"
                    >
                      결과
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {currentUser && (
                  <span 
                    className={`font-bold ${
                      currentUser.email === 'manionadmin@manion.com' 
                        ? 'text-red-400' 
                        : 'text-white font-bold'
                    }`}
                  >
                    {currentUser.name || currentUser.email.split('@')[0]}
                  </span>
                )}
                
                <Button
                  onClick={() => setShowSettingsMenu(true)}
                  size="sm"
                  variant="ghost"
                  className="text-slate-400 hover:text-white"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </nav>

        {/* Full Screen Community Content */}
        <div className="pt-16">
          <CommunitySection />
        </div>

        <Toaster />
      </div>
    );
  }

  // If showing analysis section, render completely different layout
  if (showAnalysisSection) {
    return (
      <div className="relative min-h-screen">
        <StarsBackground />
        
        {/* Navigation for Analysis Page */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-blue-500/10">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-8">
                <button
                  onClick={navigationHandlers.home}
                  className="text-xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent hover:scale-105 transition-transform"
                >
                  Manion
                </button>
                
                <div className="hidden md:flex gap-6">
                  <button
                    onClick={navigationHandlers.home}
                    className="text-slate-400 hover:text-blue-300 transition-colors"
                  >
                    홈
                  </button>
                  <button
                    onClick={navigationHandlers.slogan}
                    className="text-slate-400 hover:text-blue-300 transition-colors"
                  >
                    소개
                  </button>
                  <button
                    onClick={navigationHandlers.community}
                    className="text-slate-400 hover:text-blue-300 transition-colors"
                  >
                    커뮤니티
                  </button>
                  {videoUrl && (
                    <button
                      onClick={navigationHandlers.analysis}
                      className="text-white hover:text-blue-300 transition-colors"
                    >
                      결과
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {currentUser && (
                  <span 
                    className={`font-bold ${
                      currentUser.email === 'manionadmin@manion.com' 
                        ? 'text-red-400' 
                        : 'text-white font-bold'
                    }`}
                  >
                    {currentUser.name || currentUser.email.split('@')[0]}
                  </span>
                )}
                
                <Button
                  onClick={() => setShowSettingsMenu(true)}
                  size="sm"
                  variant="ghost"
                  className="text-slate-400 hover:text-white"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </nav>

        {/* Full Screen Analysis Content */}
        <div className="pt-16">
          <ResultAnalysisSection 
            problemId={currentProblemId}
            videoUrl={videoUrl}
            onStartNew={handleStartNew}
          />
        </div>

        <Toaster />
      </div>
    );
  }

  // Normal layout for main website
  return (
    <div className="relative">
      <StarsBackground />
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-blue-500/10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-8">
              <button
                onClick={navigationHandlers.home}
                className="text-xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent hover:scale-105 transition-transform"
              >
                Manion
              </button>
              
              <div className="hidden md:flex gap-6">
                <button
                  onClick={navigationHandlers.home}
                  className="text-slate-400 hover:text-blue-300 transition-colors"
                >
                  홈
                </button>
                <button
                  onClick={navigationHandlers.slogan}
                  className="text-slate-400 hover:text-blue-300 transition-colors"
                >
                  소개
                </button>
                <button
                  onClick={navigationHandlers.community}
                  className="text-slate-400 hover:text-blue-300 transition-colors"
                >
                  커뮤니티
                </button>
                {videoUrl && (
                  <button
                    onClick={navigationHandlers.analysis}
                    className="text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    결과
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {currentUser && (
                <span 
                  className={`font-bold ${
                    currentUser.email === 'manionadmin@manion.com' 
                      ? 'text-red-400' 
                      : 'text-white font-bold'
                  }`}
                >
                  {currentUser.name || currentUser.email.split('@')[0]}
                </span>
              )}
              
              <div className="flex items-center gap-2">
                {/* Mobile-only community button */}
                <div className="md:hidden">
                  <Button
                    onClick={navigationHandlers.community}
                    size="sm"
                    variant="ghost"
                    className="text-slate-400 hover:text-blue-300"
                  >
                    커뮤니티
                  </Button>
                </div>
                
                {/* Mobile-only results button */}
                {videoUrl && (
                  <div className="md:hidden">
                    <Button
                      onClick={navigationHandlers.analysis}
                      size="sm"
                      variant="ghost"
                      className="text-blue-400 hover:text-blue-300"
                    >
                      결과
                    </Button>
                  </div>
                )}
                
                <Button
                  onClick={() => setShowSettingsMenu(true)}
                  size="sm"
                  variant="ghost"
                  className="text-slate-400 hover:text-white"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Home Section */}
      <section ref={homeRef} className="min-h-screen flex flex-col relative">
        <div className="flex-1">
          {isProcessing ? (
            <LoadingSection problemId={currentProblemId} onComplete={handleLoadingComplete} />
          ) : (
            <UploadSection onUploadSuccess={handleUploadSuccess} />
          )}
        </div>
        
        {/* Scroll indicator arrow */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
          <button
            onClick={scrollHandlers.toSlogan}
            className="animate-bounce text-blue-400 hover:text-blue-300 transition-colors group"
            aria-label="소개 섹션으로 이동"
          >
            <ChevronDown className="w-6 md:w-8 h-6 md:h-8 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </section>

      {/* Slogan Section */}
      <section ref={sloganRef} className="min-h-screen flex flex-col justify-center px-4 py-16 md:py-24">
        <div className="text-center space-y-6 md:space-y-12 max-w-6xl mx-auto w-full">
          <div className="space-y-4 md:space-y-10">
            <h1 className="text-4xl md:text-7xl lg:text-8xl xl:text-9xl font-bold bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 bg-clip-text text-transparent leading-tight">
              Manion
            </h1>
            
            <div className="space-y-3 md:space-y-8">
              <h2 className="text-xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white leading-tight">
                복잡성을 드러내고 가능성을 열다
              </h2>
              
              <h3 className="text-lg md:text-3xl lg:text-4xl xl:text-5xl font-medium text-blue-300 italic">
                "수학을 눈으로 보다"
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10 mt-8 md:mt-16">
            <div className="text-center space-y-3 md:space-y-4">
              <div className="w-14 md:w-16 h-14 md:h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto">
                <span className="text-xl md:text-2xl font-bold text-white">1</span>
              </div>
              <h4 className="text-base md:text-lg font-semibold text-white">문제 인식</h4>
              <p className="text-sm md:text-base text-slate-300">AI가 수학 문제의 구조와 핵심을 파악합니다</p>
            </div>
            
            <div className="text-center space-y-3 md:space-y-4">
              <div className="w-14 md:w-16 h-14 md:h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto">
                <span className="text-xl md:text-2xl font-bold text-white">2</span>
              </div>
              <h4 className="text-base md:text-lg font-semibold text-white">시각화</h4>
              <p className="text-sm md:text-base text-slate-300">복잡한 수학적 개념을 직관적으로 표현합니다</p>
            </div>
            
            <div className="text-center space-y-3 md:space-y-4">
              <div className="w-14 md:w-16 h-14 md:h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto">
                <span className="text-xl md:text-2xl font-bold text-white">3</span>
              </div>
              <h4 className="text-base md:text-lg font-semibold text-white">학습 혁신</h4>
              <p className="text-sm md:text-base text-slate-300">새로운 방식으로 수학을 이해하고 학습합니다</p>
            </div>
          </div>
        </div>
      </section>

      <Toaster />
    </div>
  );
}