'use client';

import { useState } from 'react';
import { AppShell } from '@/components/shell/app-shell';
import { Card, CardHeader, CardTitle, CardBody, Badge, Button, Avatar } from '@/components/ui/primitives';
import { ME } from '@/lib/fixtures';
import {
  User as UserIcon, Bell, Lock, Globe, Palette, Smartphone, Key, Mail,
  Shield, Eye, EyeOff, Camera, Check, ChevronRight, Sparkles, Github,
  Slack, AlertCircle, Trash2, Download,
} from 'lucide-react';

const SECTIONS = [
  { id: 'profile',      label: '프로필',         icon: UserIcon },
  { id: 'account',      label: '계정 · 보안',    icon: Lock },
  { id: 'notifications',label: '알림',           icon: Bell },
  { id: 'appearance',   label: '화면 · 언어',    icon: Palette },
  { id: 'integrations', label: '연동',           icon: Globe },
  { id: 'sessions',     label: '세션 · 디바이스', icon: Smartphone },
  { id: 'data',         label: '데이터 · 내보내기', icon: Download },
] as const;

export default function SettingsPage() {
  const [section, setSection] = useState<typeof SECTIONS[number]['id']>('profile');

  return (
    <AppShell title="개인 설정" subtitle="프로필 · 알림 · 보안 · 연동">
      <div className="p-6">
        <div className="grid grid-cols-12 gap-5 max-w-[1200px]">
          {/* Sidebar */}
          <Card className="col-span-3 self-start sticky top-[72px]">
            <div className="p-3 border-b border-border flex items-center gap-2.5">
              <Avatar user={ME} size={36} />
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px] font-semibold text-fg truncate">{ME.name}</div>
                <div className="text-[11px] text-fg-3 truncate">{ME.email}</div>
              </div>
            </div>
            <div className="p-2">
              {SECTIONS.map(s => {
                const Icon = s.icon;
                const sel = section === s.id;
                return (
                  <button key={s.id} onClick={() => setSection(s.id)}
                    className={`w-full flex items-center gap-2.5 px-2.5 h-8 rounded-md text-[12.5px] transition-colors ${sel ? 'bg-accent-soft text-accent-strong font-semibold' : 'text-fg-1 hover:bg-hover'}`}
                  >
                    <Icon size={13} /> <span className="flex-1 text-left">{s.label}</span>
                    {sel && <ChevronRight size={11} />}
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Content */}
          <div className="col-span-9 space-y-4">
            {section === 'profile'       && <ProfileSection />}
            {section === 'account'       && <AccountSection />}
            {section === 'notifications' && <NotificationsSection />}
            {section === 'appearance'    && <AppearanceSection />}
            {section === 'integrations'  && <IntegrationsSection />}
            {section === 'sessions'      && <SessionsSection />}
            {section === 'data'          && <DataSection />}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

/* Profile ------------------------------------------------------------ */
function ProfileSection() {
  return (
    <>
      <Card>
        <CardHeader><CardTitle>프로필</CardTitle><span className="text-[11px] text-success flex items-center gap-1"><Check size={11} />자동 저장</span></CardHeader>
        <CardBody className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar user={ME} size={72} />
              <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-accent text-accent-fg grid place-items-center shadow-md hover:bg-accent-strong">
                <Camera size={13} />
              </button>
            </div>
            <div className="text-[11.5px] text-fg-3 leading-relaxed">
              JPG, PNG · 최대 2MB<br/>권장: 256×256 이상
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="이름"      value={ME.name} />
            <Field label="영문 이름"  value="Jiwoo Kim" />
            <Field label="이메일"    value={ME.email!} hint="회사 메일 — 변경 불가" disabled />
            <Field label="휴대폰"    value="010-2842-7314" />
            <Field label="직책"      value={ME.role} />
            <Field label="부서"      value={ME.dept} />
          </div>

          <div className="space-y-1.5">
            <Label>한 줄 소개</Label>
            <textarea rows={2} defaultValue="모바일 v3 리뉴얼 PM. 디자인-엔지니어링 협업과 OKR 트래킹 담당."
              className="w-full px-3 py-2 rounded-md bg-bg-1 border border-border text-[12.5px] text-fg outline-none focus:border-accent resize-none" />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>업무 환경</CardTitle></CardHeader>
        <CardBody className="space-y-3">
          <Field label="근무지" value="본사 (서울 · 강남)" />
          <Field label="시간대" value="(GMT+9) Asia/Seoul" />
          <Field label="근무 시간" value="09:00 ~ 18:00 (유연근무 ~10:00)" />
          <Toggle label="현재 상태 자동 동기화" sub="캘린더 일정에 따라 '회의 중', '집중 모드' 자동 표시" defaultOn />
        </CardBody>
      </Card>
    </>
  );
}

/* Account ------------------------------------------------------------ */
function AccountSection() {
  return (
    <>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-1.5"><Lock size={13} /> 비밀번호</CardTitle></CardHeader>
        <CardBody className="space-y-3 max-w-md">
          <div className="space-y-1.5"><Label>현재 비밀번호</Label><PwInput /></div>
          <div className="space-y-1.5"><Label>새 비밀번호</Label><PwInput /></div>
          <div className="space-y-1.5"><Label>새 비밀번호 확인</Label><PwInput /></div>
          <div className="text-[11px] text-fg-3 leading-relaxed pt-1">
            • 8자 이상 · 대소문자 + 숫자 + 특수문자<br/>
            • 마지막 변경: 2026-01-14 (104일 전) · <span className="text-warning">90일 이상 권장 변경</span>
          </div>
          <Button size="md" variant="primary">비밀번호 변경</Button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5"><Shield size={13} /> 2단계 인증 (MFA)</CardTitle>
          <Badge tone="success">활성</Badge>
        </CardHeader>
        <CardBody className="space-y-3">
          <Toggle label="OTP 앱 (Google Authenticator)" sub="iPhone 14 Pro에 등록됨 · 2025-12-08" defaultOn />
          <Toggle label="SMS 백업 코드" sub="010-****-7314" defaultOn />
          <Toggle label="보안 키 (FIDO2)" sub="등록된 키 없음" />
          <button className="text-[11.5px] text-accent hover:underline">백업 코드 다시 보기 →</button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-1.5"><Key size={13} /> 로그인 방식</CardTitle></CardHeader>
        <CardBody className="space-y-2.5">
          <ProviderRow icon={Mail}   name="회사 SSO"     status="기본 · 자동 연결" connected />
          <ProviderRow icon={Github} name="GitHub"      status="github.com/jiwoo-omelet" connected />
          <ProviderRow icon={Slack}  name="Slack"       status="omelet.slack.com" connected />
          <ProviderRow icon={Globe}  name="Google"      status="연결되지 않음" />
        </CardBody>
      </Card>
    </>
  );
}

/* Notifications ------------------------------------------------------ */
function NotificationsSection() {
  const channels = [
    { id: 'mention',  label: '나를 언급한 댓글',     desc: '@김지우로 호출되었을 때',          email: true,  push: true,  inapp: true },
    { id: 'task',     label: '내게 할당된 태스크',   desc: '담당자 변경, 마감 임박',           email: true,  push: true,  inapp: true },
    { id: 'review',   label: '검토 요청',           desc: '결재, PR, 디자인 리뷰',            email: true,  push: false, inapp: true },
    { id: 'status',   label: '프로젝트 상태 변경',   desc: '시작 · 완료 · 보류',                email: false, push: false, inapp: true },
    { id: 'doc',      label: '문서 업데이트',       desc: '구독 중인 문서 발행/수정',          email: false, push: false, inapp: true },
    { id: 'report',   label: '주간 / 월간 보고',     desc: 'AI 요약 발송',                     email: true,  push: false, inapp: true },
    { id: 'system',   label: '시스템 알림',         desc: '점검 · 업데이트 · 보안',           email: true,  push: true,  inapp: true },
  ];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5"><Bell size={13} /> 알림 채널</CardTitle>
          <Badge tone="info">스마트 알림</Badge>
        </CardHeader>
        <CardBody>
          <div className="grid gap-2 mb-3" style={{ gridTemplateColumns: '1fr 80px 80px 80px' }}>
            <div className="text-[10.5px] uppercase tracking-wider text-fg-3 font-semibold">알림 종류</div>
            <div className="text-[10.5px] uppercase tracking-wider text-fg-3 font-semibold text-center">이메일</div>
            <div className="text-[10.5px] uppercase tracking-wider text-fg-3 font-semibold text-center">푸시</div>
            <div className="text-[10.5px] uppercase tracking-wider text-fg-3 font-semibold text-center">앱 내</div>
          </div>
          {channels.map(c => (
            <div key={c.id} className="grid items-center gap-2 py-2.5 border-t border-border" style={{ gridTemplateColumns: '1fr 80px 80px 80px' }}>
              <div>
                <div className="text-[12.5px] font-medium text-fg">{c.label}</div>
                <div className="text-[10.5px] text-fg-3">{c.desc}</div>
              </div>
              <SwitchInline on={c.email} />
              <SwitchInline on={c.push} />
              <SwitchInline on={c.inapp} />
            </div>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>방해 금지 시간</CardTitle></CardHeader>
        <CardBody className="space-y-3">
          <Toggle label="저녁 방해 금지" sub="평일 19:00 ~ 다음날 09:00 — 긴급 (P0) 제외" defaultOn />
          <Toggle label="주말 방해 금지" sub="토요일 00:00 ~ 일요일 23:59" defaultOn />
          <Toggle label="회의 중 자동 음소거" sub="캘린더 회의 시간 동안 모든 알림 보류" defaultOn />
          <Toggle label="휴가 중 자동 응답" sub="휴가 신청 시 자동으로 부재 응답 활성" />
        </CardBody>
      </Card>

      <Card>
        <CardBody className="!p-4 flex items-start gap-3 bg-accent-soft/30">
          <Sparkles size={14} className="text-accent shrink-0 mt-0.5" />
          <div className="text-[12px] text-fg-1 leading-relaxed">
            <span className="font-semibold text-accent-strong">AI 알림 학습 </span>
            지난 30일 동안 무시한 알림을 분석한 결과, <span className="font-semibold text-fg">"문서 업데이트" 푸시</span>를 95% 무시했습니다. 푸시를 끄는 것을 추천합니다.
          </div>
          <Button size="sm" variant="secondary">적용</Button>
        </CardBody>
      </Card>
    </>
  );
}

/* Appearance --------------------------------------------------------- */
function AppearanceSection() {
  return (
    <>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-1.5"><Palette size={13} /> 테마</CardTitle></CardHeader>
        <CardBody>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'light', label: '라이트', bg: '#FAFAFB', fg: '#111827' },
              { id: 'dark',  label: '다크',   bg: '#0E0F12', fg: '#F4F4F6' },
              { id: 'auto',  label: '시스템 자동', bg: 'linear-gradient(90deg, #FAFAFB 50%, #0E0F12 50%)', fg: '#5B6CFF' },
            ].map((t, i) => (
              <button key={t.id} className={`p-3 rounded-lg border-2 ${i === 0 ? 'border-accent' : 'border-border'} hover:border-accent-strong transition-colors`}>
                <div className="aspect-[4/3] rounded mb-2 border border-border" style={{ background: t.bg }}>
                  <div className="h-full grid place-items-center text-[11px] font-bold" style={{ color: t.fg }}>Aa</div>
                </div>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="font-medium text-fg">{t.label}</span>
                  {i === 0 && <Check size={13} className="text-accent" />}
                </div>
              </button>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>액센트 컬러</CardTitle></CardHeader>
        <CardBody>
          <div className="flex items-center gap-2.5">
            {['#5B6CFF','#7C5CFF','#A66CFF','#34B27D','#F2A93B','#E94B8A','#2A86E0'].map((c, i) => (
              <button key={c} className={`w-9 h-9 rounded-full grid place-items-center ring-2 transition-all ${i === 0 ? 'ring-accent ring-offset-2 ring-offset-bg-elev' : 'ring-transparent hover:ring-border-strong'}`}
                style={{ background: c }}>
                {i === 0 && <Check size={14} className="text-white" />}
              </button>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>밀도 · 레이아웃</CardTitle></CardHeader>
        <CardBody className="space-y-3">
          <Radio label="기본 (편안한 간격)" defaultChecked name="density" />
          <Radio label="컴팩트 (정보 밀도 높음)" name="density" />
          <Radio label="여유 (큰 여백, 큰 글자)" name="density" />
          <div className="border-t border-border pt-3">
            <Toggle label="사이드바 자동 접힘 (작은 화면)" defaultOn />
            <Toggle label="애니메이션 줄이기" sub="모션 멀미 방지" />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>언어 · 지역</CardTitle></CardHeader>
        <CardBody className="space-y-3">
          <Field label="표시 언어" value="한국어" select />
          <Field label="시간대" value="(GMT+9) Asia/Seoul" select />
          <Field label="날짜 형식" value="2026-04-28 (ISO)" select />
          <Field label="첫 요일" value="월요일" select />
        </CardBody>
      </Card>
    </>
  );
}

/* Integrations ------------------------------------------------------- */
function IntegrationsSection() {
  const apps = [
    { name: 'Notion',     desc: 'DB 양방향 동기화 · 6개 DB 연결됨', status: 'connected', updated: '5분 전' },
    { name: 'GitHub',     desc: '4개 저장소 · PR/이슈 자동 연동', status: 'connected', updated: '12분 전' },
    { name: 'Slack',      desc: '#all-flow-알림 · DM 봇',         status: 'connected', updated: '1시간 전' },
    { name: 'Google',     desc: '캘린더 · Drive · Meet',           status: 'connected', updated: '2시간 전' },
    { name: 'Figma',      desc: '디자인 파일 임베드',              status: 'connected', updated: '어제' },
    { name: 'Jira',       desc: '이슈 마이그레이션',                status: 'available' },
    { name: 'Linear',     desc: '이슈 양방향 동기화',              status: 'available' },
    { name: 'Zapier',     desc: '5,000+ 앱 자동화',                status: 'available' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5"><Globe size={13} /> 연동 앱</CardTitle>
        <Badge tone="success">5개 연결됨</Badge>
      </CardHeader>
      <div>
        {apps.map(a => (
          <div key={a.name} className="flex items-center gap-3 px-5 py-3 border-b border-border last:border-b-0 hover:bg-hover">
            <div className="w-9 h-9 rounded-md bg-bg-1 border border-border grid place-items-center text-fg-2 font-bold text-[13px]">
              {a.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-fg">{a.name}</div>
              <div className="text-[11px] text-fg-3">{a.desc}</div>
            </div>
            {a.updated && <span className="text-[10.5px] mono text-fg-3 mr-2">{a.updated}</span>}
            {a.status === 'connected' ? (
              <>
                <Badge tone="success">연결됨</Badge>
                <Button size="sm" variant="ghost">설정</Button>
              </>
            ) : (
              <Button size="sm" variant="primary">연결</Button>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

/* Sessions ----------------------------------------------------------- */
function SessionsSection() {
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-1.5"><Smartphone size={13} /> 활성 세션</CardTitle><Button size="sm" variant="danger">모든 다른 세션 로그아웃</Button></CardHeader>
      <div>
        {[
          { device: 'MacBook Pro 16" (M3 Max)', os: 'macOS 14.4 · Chrome 124',  loc: '서울 · 강남구',  last: '지금', current: true,  ip: '121.142.***.42' },
          { device: 'iPhone 14 Pro',           os: 'iOS 17.4 · ALL-Flow 앱',    loc: '서울 · 강남구',  last: '8분 전',                ip: '121.142.***.42' },
          { device: 'iPad Pro 12.9"',          os: 'iPadOS 17.4 · Safari',     loc: '서울 · 성수동',  last: '어제',                 ip: '211.34.***.18'  },
          { device: 'Windows Desktop',         os: 'Windows 11 · Edge 124',    loc: '서울 · 광화문',  last: '3일 전',               ip: '14.6.***.91'    },
        ].map((s, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-3.5 border-b border-border last:border-b-0">
            <div className="w-10 h-10 rounded-md bg-bg-1 border border-border grid place-items-center text-fg-2"><Smartphone size={16} /></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="text-[13px] font-semibold text-fg">{s.device}</div>
                {s.current && <Badge tone="accent">현재</Badge>}
              </div>
              <div className="text-[11px] text-fg-3">{s.os} · {s.loc} · <span className="mono">{s.ip}</span></div>
            </div>
            <span className="text-[11.5px] mono text-fg-3 mr-2">{s.last}</span>
            {!s.current && <Button size="sm" variant="secondary">로그아웃</Button>}
          </div>
        ))}
      </div>
    </Card>
  );
}

/* Data --------------------------------------------------------------- */
function DataSection() {
  return (
    <>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-1.5"><Download size={13} /> 데이터 내보내기</CardTitle></CardHeader>
        <CardBody className="space-y-2.5">
          <div className="text-[12px] text-fg-2 leading-relaxed">개인 활동 내역, 작성한 문서, 댓글, 첨부 파일을 ZIP으로 다운로드할 수 있습니다. 처리에 최대 24시간 소요.</div>
          <div className="flex items-center gap-2">
            <Button size="md" variant="primary"><Download size={13} /> 전체 데이터 내보내기 (.zip)</Button>
            <Button size="md" variant="secondary">문서만 (.md)</Button>
          </div>
          <div className="text-[10.5px] text-fg-3 mono pt-2">마지막 내보내기: 2026-02-14 · 24.6 MB</div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-1.5 text-danger"><AlertCircle size={13} /> 위험 영역</CardTitle></CardHeader>
        <CardBody className="space-y-3">
          <DangerRow title="활동 이력 삭제" desc="검색 기록, AI 채팅 이력 등 개인 활동을 모두 삭제합니다." cta="삭제" />
          <DangerRow title="모든 세션 종료" desc="다른 디바이스에서 로그아웃됩니다." cta="실행" />
          <DangerRow title="계정 비활성화" desc="30일 후 자동 삭제. 이 기간 내 복구 가능." cta="비활성화" />
          <DangerRow title="계정 영구 삭제" desc="복구 불가능. 작성한 문서·댓글은 워크스페이스에 보존됩니다." cta="영구 삭제" critical />
        </CardBody>
      </Card>
    </>
  );
}

/* Helpers ------------------------------------------------------------ */
function Field({ label, value, hint, disabled, select }: { label: string; value: string; hint?: string; disabled?: boolean; select?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {select ? (
        <select className={`w-full h-9 px-2.5 rounded-md bg-bg-1 border border-border text-[12.5px] outline-none focus:border-accent ${disabled ? 'text-fg-3' : 'text-fg'}`}>
          <option>{value}</option>
        </select>
      ) : (
        <input defaultValue={value} disabled={disabled}
          className={`w-full h-9 px-2.5 rounded-md bg-bg-1 border border-border text-[12.5px] outline-none focus:border-accent ${disabled ? 'text-fg-3 cursor-not-allowed' : 'text-fg'}`} />
      )}
      {hint && <div className="text-[10.5px] text-fg-3">{hint}</div>}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-[10.5px] uppercase tracking-wider font-semibold text-fg-3">{children}</label>;
}

function PwInput() {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input type={show ? 'text' : 'password'} defaultValue="••••••••••••"
        className="w-full h-9 pl-2.5 pr-9 rounded-md bg-bg-1 border border-border text-[12.5px] text-fg outline-none focus:border-accent" />
      <button onClick={() => setShow(s => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-fg-3 hover:text-fg-1">
        {show ? <EyeOff size={13} /> : <Eye size={13} />}
      </button>
    </div>
  );
}

function Toggle({ label, sub, defaultOn }: { label: string; sub?: string; defaultOn?: boolean }) {
  const [on, setOn] = useState(!!defaultOn);
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] font-medium text-fg">{label}</div>
        {sub && <div className="text-[10.5px] text-fg-3 mt-0.5">{sub}</div>}
      </div>
      <button onClick={() => setOn(!on)}
        className={`shrink-0 w-9 h-5 rounded-full transition-colors relative ${on ? 'bg-accent' : 'bg-bg-2 border border-border'}`}
        aria-pressed={on}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
      </button>
    </div>
  );
}

function SwitchInline({ on }: { on: boolean }) {
  const [v, setV] = useState(on);
  return (
    <div className="flex justify-center">
      <button onClick={() => setV(!v)} className={`w-8 h-[18px] rounded-full transition-colors relative ${v ? 'bg-accent' : 'bg-bg-2 border border-border'}`}>
        <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-all ${v ? 'left-[15px]' : 'left-0.5'}`} />
      </button>
    </div>
  );
}

function Radio({ label, defaultChecked, name }: { label: string; defaultChecked?: boolean; name: string }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer py-1">
      <input type="radio" name={name} defaultChecked={defaultChecked} className="accent-[var(--color-accent)] w-4 h-4" />
      <span className="text-[12.5px] text-fg-1">{label}</span>
    </label>
  );
}

function ProviderRow({ icon: Icon, name, status, connected }: { icon: typeof Mail; name: string; status: string; connected?: boolean }) {
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-md border border-border">
      <div className="w-8 h-8 rounded-md bg-bg-1 border border-border grid place-items-center text-fg-2"><Icon size={14} /></div>
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] font-semibold text-fg">{name}</div>
        <div className="text-[10.5px] text-fg-3">{status}</div>
      </div>
      {connected ? <Button size="sm" variant="ghost">연결 해제</Button> : <Button size="sm" variant="secondary">연결</Button>}
    </div>
  );
}

function DangerRow({ title, desc, cta, critical }: { title: string; desc: string; cta: string; critical?: boolean }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-md border border-border">
      <Trash2 size={14} className={`mt-0.5 ${critical ? 'text-danger' : 'text-fg-3'}`} />
      <div className="flex-1">
        <div className={`text-[12.5px] font-semibold ${critical ? 'text-danger' : 'text-fg'}`}>{title}</div>
        <div className="text-[11px] text-fg-3">{desc}</div>
      </div>
      <Button size="sm" variant={critical ? 'danger' : 'secondary'}>{cta}</Button>
    </div>
  );
}
