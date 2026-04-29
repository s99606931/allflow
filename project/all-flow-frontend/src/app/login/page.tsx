'use client';

import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/primitives';
import { Sparkles, Lock } from 'lucide-react';
import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('jiwoo.kim@omelet.com');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState<string | null>(null);

  async function loginCredentials(e: React.FormEvent) {
    e.preventDefault();
    setLoading('credentials');
    await signIn('credentials', { email, password, redirectTo: '/' });
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-bg">
      {/* LEFT — brand panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-accent to-accent-strong text-white relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-white/15 backdrop-blur grid place-items-center font-bold text-[15px]">오</div>
            <div className="text-[15px] font-bold tracking-tight">ALL-Flow</div>
          </div>
        </div>

        <div className="relative z-10 max-w-[440px]">
          <div className="text-[11px] uppercase tracking-[0.18em] opacity-70 font-semibold">AI-First 협업 플랫폼</div>
          <h1 className="text-[36px] font-bold tracking-tight leading-[1.15] mt-3">
            회의록을 액션으로,<br />
            보고서를 자동으로.
          </h1>
          <p className="text-[14px] opacity-85 mt-4 leading-relaxed">
            오믈렛의 모든 협업 흐름을 한 곳에서. 프로젝트 · 태스크 · 이슈 · 문서 · 보고서까지,
            AI가 옆에서 끊임없이 도와줍니다.
          </p>

          <div className="grid grid-cols-3 gap-3 mt-8">
            {[
              { v: '94%', l: 'SLA 준수율' },
              { v: '12h', l: '평균 보고 시간 단축' },
              { v: '5+', l: '연동 도구' },
            ].map(s => (
              <div key={s.l} className="rounded-lg bg-white/10 backdrop-blur px-3 py-2.5">
                <div className="text-[20px] font-bold mono">{s.v}</div>
                <div className="text-[10.5px] opacity-80">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-[11px] opacity-70">© 2026 Omelet · 보안 인증 ISO 27001</div>

        {/* decorative blobs */}
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-20 w-[400px] h-[400px] rounded-full bg-white/5 blur-3xl" />
      </div>

      {/* RIGHT — form */}
      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-[400px]">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-md bg-accent text-accent-fg grid place-items-center font-bold">오</div>
            <div className="text-[14px] font-bold">ALL-Flow</div>
          </div>

          <h2 className="text-[24px] font-bold tracking-tight">로그인</h2>
          <p className="text-[13px] text-fg-2 mt-1">사내 계정으로 로그인하세요</p>

          {/* SSO buttons */}
          <div className="space-y-2 mt-7">
            <button
              onClick={() => { setLoading('google'); signIn('google', { redirectTo: '/' }); }}
              disabled={!!loading}
              className="w-full h-11 rounded-md border border-border bg-bg-elev hover:bg-hover text-fg flex items-center justify-center gap-2.5 text-[13px] font-medium transition-colors disabled:opacity-50"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
                <path fill="#4285F4" d="M15.6 8.18c0-.55-.05-1.08-.14-1.6H8v3.03h4.27a3.65 3.65 0 0 1-1.58 2.4v2h2.56c1.5-1.38 2.36-3.42 2.36-5.83Z"/>
                <path fill="#34A853" d="M8 16c2.13 0 3.92-.71 5.22-1.93l-2.55-1.99c-.71.48-1.62.76-2.67.76-2.05 0-3.79-1.39-4.4-3.25H.96v2.05A8 8 0 0 0 8 16Z"/>
                <path fill="#FBBC05" d="M3.6 9.6c-.16-.48-.25-1-.25-1.53s.09-1.05.25-1.53V4.5H.96A8 8 0 0 0 0 8.07c0 1.29.31 2.51.86 3.58L3.6 9.6Z"/>
                <path fill="#EA4335" d="M8 3.18c1.16 0 2.2.4 3.02 1.18l2.27-2.27A8 8 0 0 0 8 0a8 8 0 0 0-7.04 4.5l2.64 2.05C4.21 4.57 5.95 3.18 8 3.18Z"/>
              </svg>
              Google 계정으로 로그인
            </button>
            <button
              onClick={() => { setLoading('kakao'); signIn('kakao', { redirectTo: '/' }); }}
              disabled={!!loading}
              className="w-full h-11 rounded-md bg-[#FEE500] hover:brightness-95 text-[#191919] flex items-center justify-center gap-2.5 text-[13px] font-medium transition disabled:opacity-50"
            >
              <span className="text-[14px]">💬</span>
              카카오로 로그인
            </button>
            <button
              disabled={!!loading}
              className="w-full h-11 rounded-md border border-border bg-bg-elev hover:bg-hover text-fg flex items-center justify-center gap-2.5 text-[13px] font-medium transition-colors disabled:opacity-50"
            >
              <Lock size={14} />
              SSO (SAML/OIDC) 로 로그인
            </button>
          </div>

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[11px] text-fg-3 uppercase tracking-wider">또는</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Credentials form */}
          <form onSubmit={loginCredentials} className="space-y-3">
            <div>
              <label className="text-[11.5px] font-semibold text-fg-1 block mb-1">사내 이메일</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@omelet.com"
                className="w-full h-10 px-3 rounded-md bg-bg-1 border border-border text-[13px] focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
              />
            </div>
            <div>
              <label className="text-[11.5px] font-semibold text-fg-1 block mb-1">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-10 px-3 rounded-md bg-bg-1 border border-border text-[13px] focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
              />
            </div>
            <Button variant="primary" type="submit" className="w-full !h-10" disabled={!!loading}>
              {loading === 'credentials' ? '로그인 중...' : '로그인'}
            </Button>
          </form>

          <div className="flex items-center justify-between text-[12px] mt-4">
            <a className="text-fg-2 hover:text-accent-strong">비밀번호 재설정</a>
            <a className="text-fg-2 hover:text-accent-strong">관리자에게 요청</a>
          </div>

          <div className="rounded-lg bg-accent-soft border border-accent/15 px-3 py-2.5 mt-6 flex items-start gap-2">
            <Sparkles size={13} className="text-accent-strong shrink-0 mt-0.5" />
            <div className="text-[11.5px] text-fg-1 leading-relaxed">
              ALL-Flow 는 워크스페이스 컨텍스트를 활용해 AI가 자동으로 회의록을 정리하고 보고서를 생성합니다.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
