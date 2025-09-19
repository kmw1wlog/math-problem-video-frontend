import React, { useState, useEffect } from 'react';
import { Loader2, Brain, Lightbulb, Rocket } from 'lucide-react';
import { Card } from './ui/card';
import { Progress } from './ui/progress';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface LoadingSectionProps {
  problemId: string;
  onComplete: (videoUrl: string) => void;
}

const quotes = [
  // 수학자 & 수학 철학
  { text: "수학은 사고를 절약하는 과학이다.", author: "앙리 푸앵카레", icon: Brain },
  { text: "수학에서 문제를 제안하는 기술은 문제를 푸는 것보다 더 가치 있다.", author: "게오르크 칸토어", icon: Brain },
  { text: "수학은 자유의 과학이다.", author: "칸토어", icon: Brain },
  { text: "시인의 마음을 갖지 않은 수학자는 결코 완전한 수학자가 아니다.", author: "바이어슈트라스", icon: Brain },
  { text: "수학적 발견의 원동력은 논리가 아니라 상상력이다.", author: "드모르간", icon: Brain },
  { text: "수학은 과학의 여왕이며, 정수론은 수학의 여왕이다.", author: "가우스", icon: Brain },
  { text: "수학은 인간 정신의 가장 위대한 창조물이다.", author: "스테파네 바나흐", icon: Brain },
  { text: "수학은 별 노력 없이 진실을 보게 한다.", author: "폴리아", icon: Brain },
  { text: "수학을 공부하는 것은 정신 체조를 하는 것이다.", author: "페스탈로치", icon: Brain },
  { text: "수학 문제는 답보다 그 과정을 통해 배운다.", author: "폴리아", icon: Brain },
  
  // 과학자
  { text: "우리는 반드시 알아야 하며, 결국 알게 될 것이다.", author: "힐베르트", icon: Lightbulb },
  { text: "과학은 질문으로 시작한다.", author: "칼 세이건", icon: Lightbulb },
  { text: "과학은 사실이 아니라 방법이다.", author: "버트런드 러셀", icon: Lightbulb },
  { text: "인류의 문제는 과학이 아니라 사람의 마음이다.", author: "아인슈타인", icon: Lightbulb },
  { text: "과학은 우리가 틀렸다는 사실을 조금씩 더 정확히 아는 것이다.", author: "필립 케퍼", icon: Lightbulb },
  { text: "자연은 수학의 언어로 쓰여 있다.", author: "갈릴레오 갈릴레이", icon: Lightbulb },
  { text: "우주를 이해하려면 수학을 이해해야 한다.", author: "스티븐 호킹", icon: Lightbulb },
  { text: "가장 큰 과학적 발견은 호기심에서 시작된다.", author: "뉴턴", icon: Lightbulb },
  { text: "과학은 스스로를 교정하는 과정이다.", author: "칼 세이건", icon: Lightbulb },
  { text: "과학의 기쁨은 모르는 것을 알아가는 데 있다.", author: "리처드 파인만", icon: Lightbulb },
  
  // 엔지니어 & 기술자
  { text: "공학은 세상에 존재하는 가장 가까운 마법이다.", author: "일론 머스크", icon: Rocket },
  { text: "공학은 실수를 통해 배운다.", author: "헨리 페트로스키", icon: Rocket },
  { text: "좋은 엔지니어는 아무것도 없는 곳에서 세상을 만든다.", author: "시어도어 폰 카르만", icon: Rocket },
  { text: "엔지니어는 1달러짜리 일을 10센트로 해결한다.", author: "아서 웰링턴", icon: Rocket },
  { text: "훌륭한 엔지니어는 문제를 만들기도 한다.", author: "스콧 애덤스", icon: Rocket },
  { text: "실패 계산은 엔지니어의 본질이다.", author: "헨리 페트로스키", icon: Rocket },
  { text: "엔지니어는 역사를 만든 사람이다.", author: "제임스 킵 핀치", icon: Rocket },
  { text: "디자인은 보이지 않는 대사이다.", author: "폴 랜드", icon: Rocket },
  { text: "단순함이 궁극의 세련됨이다.", author: "레오나르도 다 빈치", icon: Rocket },
  { text: "프로토타입을 경계하라.", author: "사이먼 R. 그린", icon: Rocket },
  
  // 창업가 & 혁신가
  { text: "디자인은 어떻게 보이는가가 아니라, 어떻게 작동하는가이다.", author: "스티브 잡스", icon: Lightbulb },
  { text: "최고의 아이디어는 행동으로 옮겨질 때만 가치가 있다.", author: "피터 드러커", icon: Lightbulb },
  { text: "미래를 예측하는 가장 좋은 방법은 미래를 창조하는 것이다.", author: "앨런 케이", icon: Lightbulb },
  { text: "위대한 제품은 단순함에서 나온다.", author: "잡스", icon: Lightbulb },
  { text: "혁신은 불편함에서 시작된다.", author: "제프 베조스", icon: Lightbulb },
  { text: "실패를 두려워하지 마라. 실패는 배움의 일부다.", author: "리드 호프먼", icon: Lightbulb },
  { text: "모험하지 않는 자는 아무것도 얻지 못한다.", author: "리처드 브랜슨", icon: Rocket },
  { text: "가장 위험한 것은 위험을 감수하지 않는 것이다.", author: "마크 저커버그", icon: Rocket },
  { text: "성장하려면 불편함을 감수해야 한다.", author: "벤 호로위츠", icon: Rocket },
  { text: "10년 후를 바꾸는 힘은 오늘의 선택이다.", author: "나발 라비칸트", icon: Rocket },
  
  // 영감과 철학
  { text: "우리는 거인의 어깨 위에 서 있다.", author: "아이작 뉴턴", icon: Brain },
  { text: "별을 바라보고 발밑을 내려다보지 마라.", author: "스티븐 호킹", icon: Brain },
  { text: "상상력은 지식보다 중요하다.", author: "아인슈타인", icon: Brain },
  { text: "위대한 정신은 아이디어를 논한다.", author: "엘리너 루즈벨트", icon: Brain },
  { text: "좋은 과학자는 아이디어를 갖는다. 좋은 엔지니어는 작동하는 디자인을 만든다.", author: "프리먼 다이슨", icon: Brain },
  { text: "지식은 힘이다.", author: "프랜시스 베이컨", icon: Brain },
  { text: "시간을 낭비하는 것은 삶의 가치를 모르는 것이다.", author: "다윈", icon: Brain },
  { text: "호기심은 천재의 첫 번째 열쇠다.", author: "사무엘 존슨", icon: Brain },
  { text: "단순화하라. 그러나 더 단순하게 만들지 마라.", author: "아인슈타인", icon: Brain },
  { text: "인생에서 가장 큰 위험은 아무 위험도 감수하지 않는 것이다.", author: "파울로 코엘료", icon: Brain },
  
  // 창의와 도전
  { text: "창의성이란 기존의 것을 새롭게 연결하는 것이다.", author: "아인슈타인", icon: Lightbulb },
  { text: "어제의 한계를 오늘의 도전으로 바꿔라.", author: "익명", icon: Lightbulb },
  { text: "계속 시도하고, 계속 실패하고, 더 잘 실패하라.", author: "사무엘 베켓", icon: Lightbulb },
  { text: "혁신은 행동에서 나온다.", author: "익명", icon: Lightbulb },
  { text: "두려움은 극복하라고 존재한다.", author: "익명", icon: Lightbulb },
  { text: "문제를 단순화하면 해결이 보인다.", author: "익명", icon: Lightbulb },
  { text: "실험 없는 진보는 없다.", author: "익명", icon: Lightbulb },
  { text: "배움은 멈추지 않는다.", author: "몬테소리", icon: Lightbulb },
  { text: "실수는 성장의 증거다.", author: "익명", icon: Lightbulb },
  { text: "변화를 두려워하지 말라.", author: "익명", icon: Lightbulb },
  
  // 우주와 호기심
  { text: "우주는 우리가 상상하는 것보다 이상하고, 상상할 수 있는 것보다 더 이상하다.", author: "홀데인", icon: Rocket },
  { text: "우리 모두는 별의 먼지로 만들어졌다.", author: "칼 세이건", icon: Rocket },
  { text: "별을 향해 쏴라. 실패해도 달에 닿을 수 있다.", author: "노먼 빈센트 필", icon: Rocket },
  { text: "관측할 수 없는 것은 설명할 수 없다.", author: "갈릴레오", icon: Rocket },
  { text: "우리는 우주가 스스로를 인식하기 위한 방식이다.", author: "칼 세이건", icon: Rocket },
  { text: "지구는 창문이다. 그 너머를 보라.", author: "닐 암스트롱", icon: Rocket },
  { text: "호기심은 우주 탐사의 원동력이다.", author: "버즈 올드린", icon: Rocket },
  { text: "인류의 미래는 별에 있다.", author: "칼 세이건", icon: Rocket },
  { text: "별빛은 시간 여행이다.", author: "익명", icon: Rocket },
  { text: "질문은 우주로 가는 첫걸음이다.", author: "익명", icon: Rocket },
  
  // 실행과 성취
  { text: "아는 것만으로는 충분하지 않다. 적용해야 한다.", author: "레오나르도 다 빈치", icon: Brain },
  { text: "성공은 반복된 작은 행동들의 합이다.", author: "로버트 콜리어", icon: Brain },
  { text: "완벽은 추가할 것이 없을 때가 아니라, 뺄 것이 없을 때 이루어진다.", author: "생텍쥐페리", icon: Brain },
  { text: "빠르게 실패하고 빠르게 배워라.", author: "에릭 리스", icon: Brain },
  { text: "작은 승리를 축하하라. 그것이 큰 변화를 만든다.", author: "익명", icon: Brain },
  { text: "도전하지 않으면 발전도 없다.", author: "익명", icon: Brain },
  { text: "매일 조금씩 개선하라.", author: "카이젠 철학", icon: Brain },
  { text: "오늘 한 걸음은 내일 열 걸음을 만든다.", author: "익명", icon: Brain },
  { text: "스스로를 이겨라.", author: "익명", icon: Brain },
  { text: "가장 어려운 문제는 가장 큰 기회를 준다.", author: "익명", icon: Brain },
  
  // 몰입과 열정
  { text: "열정은 에너지다. 당신이 사랑하는 것에 집중하라.", author: "오프라 윈프리", icon: Lightbulb },
  { text: "하고 싶은 일을 하라. 그러면 평생 일하지 않아도 된다.", author: "공자", icon: Lightbulb },
  { text: "몰입은 최고의 즐거움이다.", author: "칙센트미하이", icon: Lightbulb },
  { text: "하루에 집중하라.", author: "익명", icon: Lightbulb },
  { text: "재능은 노력으로 꽃핀다.", author: "익명", icon: Lightbulb },
  { text: "실패의 쓴맛은 성공의 단맛을 더한다.", author: "익명", icon: Lightbulb },
  { text: "사랑하지 않는 일을 잘할 수는 없다.", author: "스티브 잡스", icon: Lightbulb },
  { text: "천재는 1%의 영감과 99%의 노력이다.", author: "에디슨", icon: Lightbulb },
  { text: "일은 삶의 의미와 목적을 준다.", author: "스티븐 호킹", icon: Lightbulb },
  { text: "계속 배우는 자가 결국 이긴다.", author: "익명", icon: Lightbulb },
  
  // 도전 정신
  { text: "불가능은 의견일 뿐이다.", author: "무하마드 알리", icon: Rocket },
  { text: "시도하지 않으면 아무것도 얻지 못한다.", author: "익명", icon: Rocket },
  { text: "새로운 것을 두려워하지 말라.", author: "익명", icon: Rocket },
  { text: "미친 아이디어가 세상을 바꾼다.", author: "스티브 잡스", icon: Rocket },
  { text: "바닥은 튀어 오르기 좋은 곳이다.", author: "바락 오바마", icon: Rocket },
  { text: "시작이 반이다.", author: "아리스토텔레스", icon: Rocket },
  { text: "아직 안 된 것은 아직 하지 않았기 때문이다.", author: "익명", icon: Rocket },
  { text: "오늘의 용기가 내일의 미래를 만든다.", author: "익명", icon: Rocket },
  { text: "스스로 길을 만들어라.", author: "로버트 프로스트", icon: Rocket },
  { text: "멈추지 않는 한 얼마나 느리게 가든 상관없다.", author: "공자", icon: Rocket }
];

export const LoadingSection: React.FC<LoadingSectionProps> = ({ problemId, onComplete }) => {
  const [currentQuote, setCurrentQuote] = useState(() => Math.floor(Math.random() * quotes.length));
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('영상 생성 중...');

  useEffect(() => {
    if (!problemId) return;

    // Rotate quotes every 6.5 seconds with random selection
    const quoteInterval = setInterval(() => {
      setCurrentQuote(Math.floor(Math.random() * quotes.length));
    }, 6500);

    // Progress simulation
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          return 100;
        }
        return prev + 2;
      });
    }, 200);

    // Check problem status with timeout
    const checkStatus = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3a80e39f/problem/${problemId}`, {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          console.error('Problem status response not ok:', response.status);
          return;
        }

        const problem = await response.json();
        
        if (problem.status === 'completed' && problem.videoUrl) {
          clearInterval(quoteInterval);
          clearInterval(progressInterval);
          clearInterval(statusInterval);
          setProgress(100);
          setStatus('영상 생성 완료!');
          setTimeout(() => onComplete(problem.videoUrl), 1000);
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          console.error('Problem status check timed out');
        } else {
          console.error('Error checking status:', error);
        }
      }
    };

    const statusInterval = setInterval(checkStatus, 3000); // Increased interval to 3 seconds
    checkStatus(); // Initial check

    return () => {
      clearInterval(quoteInterval);
      clearInterval(progressInterval);
      clearInterval(statusInterval);
    };
  }, [problemId, onComplete]);

  const quote = quotes[currentQuote];
  const Icon = quote.icon;

  return (
    <section className="min-h-screen flex items-center justify-center px-4 py-16 md:py-24">
      <div className="max-w-2xl w-full space-y-6">
        {/* Status Card */}
        <Card className="border-purple-500/30 bg-card/50 backdrop-blur-lg">
          <div className="p-8 text-center space-y-6">
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center animate-pulse">
                  <Loader2 className="w-10 h-10 text-white animate-spin" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full animate-ping opacity-20"></div>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">{status}</h2>
              <p className="text-slate-300">
                AI가 수학 문제를 분석하고 단계별 풀이 영상을 생성하고 있습니다
              </p>
              <p className="text-sm text-yellow-300 font-medium">
                *각도와 길이반영 실제 비율이기에 교과서 문제와 다른생김새일수있습니다.
              </p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-slate-400">{progress.toFixed(0)}% 완료</p>
            </div>
          </div>
        </Card>

        {/* Quote Card */}
        <Card className="border-blue-500/30 bg-card/50 backdrop-blur-lg">
          <div className="p-6 text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <Icon className="w-6 h-6 text-white" />
              </div>
            </div>
            
            <div className="space-y-2">
              <blockquote className="text-lg text-white font-medium italic">
                "{quote.text}"
              </blockquote>
              <cite className="text-blue-300 font-medium">- {quote.author}</cite>
            </div>
          </div>
        </Card>

        {/* Loading Animation */}
        <div className="flex justify-center space-x-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-3 h-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    </section>
  );
};