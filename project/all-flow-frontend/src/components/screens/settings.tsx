'use client';

import { Card, CardHeader, CardTitle, CardBody, Avatar, AvatarStack, Badge, Button, IconButton } from '@/components/ui/primitives';
import { ME } from '@/lib/fixtures';
import {
  User, Bell, Shield, Palette, Globe, Keyboard, Plug, Trash2, Check,
  Smartphone, Monitor, MapPin, Clock, Camera, Eye, EyeOff, ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { useUIStore } from '@/store/ui-store';

const SECTIONS = [
  { id: 'profile',       label: '프로필',         icon: User },
  { id: 'notifications', label: '알림',           icon: Bell },
  { id: 'security',      label: '보안 / 세션',    icon: Shield },
  { id: 'appearance',    label: '외관',           icon: Palette },
  { id: 'language',      label: '언어 / 시간대',  icon: Globe },
  { id: 'shortcuts',     label: '단축키',         icon: Keyboard },
  { id: 'integrations',  label: '연결된 앱',      icon: Plug },
  { id: 'danger',        label: '계정 삭제',      icon: Trash2 },
] as const;
type SectionId = typeof SECTIONS[number]['id'];

export function SettingsPage() {
  const [active, setActive] = useState<SectionId>('profile');

  return (
    <div className="flex h-[calc(100vh-56px)]">
      {/* Sidebar */}
      <aside className="w-[240px] border-r border-border bg-bg-1 p-3 space-y-0.5">
        <div className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wider text-fg-3">개인 설정</div>
        {SECTIONS.map(s => {
          const Icon = s.icon;
          const isActive = active === s.id;
          const isDanger = s.id === 'danger';
          return (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className={`w-full flex items-center gap-2.5 px-2.5 h-9 rounded-md text-[12.5px] transition-colors ${
                isActive ? 'bg-accent-soft text-accent-strong font-semibold' :
                isDanger ? 'text-danger hover:bg-danger-soft' :
                'text-fg-1 hover:bg-hover'
              }`}
            >
              <Icon size={14} />
              <span>{s.label}</span>
            </button>
          );
        })}
      </aside>

      <div className="flex-1 overflow-y-auto scroll">
        <div className="max-w-[820px] mx-auto p-8">
          {active === 'profile'       && <ProfileSection />}
          {active === 'notifications' && <NotifSection />}
          {active === 'security'      && <SecuritySection />}
          {active === 'appearance'    && <AppearanceSection />}
          {active === 'language'      && <LanguageSection />}
          {active === 'shortcuts'     && <ShortcutsSection />}
          {active === 'integrations'  && <IntegrationsSection />}
          {active === 'danger'        && <DangerSection />}
        </div>
      </div>
    </div>
  );
}

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[18px] font-bold text-fg">{title}</h2>
        {desc && <p className="text-[12.5px] text-fg-3 mt-1">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

function Row({ label, sub, children }: { label: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 py-3 border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] font-medium text-fg">{label}</div>
        {sub && <div className="text-[11.5px] text-fg-3 mt-0.5 leading-relaxed">{sub}</div>}
      </div>
      <div className="shrink-0 flex items-center gap-2">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-9 h-5 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-bg-2 border border-border'}`}
      aria-pressed={checked}
    >
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  );
}

/* Profile -------------------------------------------------------------- */
function ProfileSection() {
  return (
    <Section title="프로필" desc="동료들이 보는 프로필 정보입니다.">
      <Card>
        <CardBody className="space-y-1">
          <div className="flex items-center gap-4 pb-4">
            <div className="relative">
              <Avatar user={ME} size={72} />
              <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-accent text-accent-fg grid place-items-center ring-2 ring-bg-elev">
                <Camera size={12} />
              </button>
            </div>
            <div>
              <div className="text-[18px] font-bold text-fg">{ME.name}</div>
              <div className="text-[12px] text-fg-2">{ME.role} · {ME.dept}</div>
              <Button size="sm" variant="secondary" className="mt-2">사진 변경</Button>
            </div>
          </div>

          <Row label="표시 이름" sub="회의 · 채팅 · 댓글에 사용됩니다.">
            <input className="h-8 px-2.5 rounded-md bg-bg-1 border border-border text-[12.5px] w-44" defaultValue={ME.name} />
          </Row>
          <Row label="이메일">
            <span className="text-[12px] text-fg-2 mono">{ME.email}</span>
          </Row>
          <Row label="직무 / 직책">
            <input className="h-8 px-2.5 rounded-md bg-bg-1 border border-border text-[12.5px] w-44" defaultValue={ME.role} />
          </Row>
          <Row label="부서">
            <input className="h-8 px-2.5 rounded-md bg-bg-1 border border-border text-[12.5px] w-44" defaultValue={ME.dept} />
          </Row>
          <Row label="자기소개" sub="동료가 프로필에서 볼 수 있는 한 줄 소개">
            <input className="h-8 px-2.5 rounded-md bg-bg-1 border border-border text-[12.5px] w-72" placeholder="간결한 한 줄 소개" />
          </Row>
          <Row label="현재 상태">
            <select className="h-8 px-2.5 rounded-md bg-bg-1 border border-border text-[12.5px]">
              <option>업무 중 🟢</option>
              <option>집중 모드 🔵</option>
              <option>회의 중 🔴</option>
              <option>자리비움 🟡</option>
            </select>
          </Row>
        </CardBody>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="secondary">취소</Button>
        <Button variant="primary">저장</Button>
      </div>
    </Section>
  );
}

/* Notifications -------------------------------------------------------- */
function NotifSection() {
  const [state, setState] = useState({
    mention: { app: true, email: true, push: true },
    sla:     { app: true, email: true, push: false },
    ai:      { app: true, email: false, push: false },
    review:  { app: true, email: true, push: true },
    digest:  { app: false, email: true, push: false },
  });

  return (
    <Section title="알림" desc="채널별로 받을 알림 종류를 선택하세요.">
      <Card>
        <div className="grid grid-cols-[1fr_60px_60px_60px] px-5 py-3 border-b border-border bg-bg-1 text-[11px] font-semibold uppercase tracking-wider text-fg-3">
          <div>유형</div>
          <div className="text-center">앱</div>
          <div className="text-center">이메일</div>
          <div className="text-center">푸시</div>
        </div>
        {([
          ['mention', '@멘션', '본인이 언급될 때'],
          ['sla',     'SLA 임박', '담당 이슈가 SLA 한도에 가까울 때'],
          ['ai',      'AI 제안', 'AI가 액션을 제안할 때'],
          ['review',  '리뷰 요청', 'PR · 디자인 리뷰 요청'],
          ['digest',  '일간 요약', '매일 오전 9시 다이제스트'],
        ] as const).map(([k, label, sub]) => {
          const row = state[k];
          return (
            <div key={k} className="grid grid-cols-[1fr_60px_60px_60px] px-5 py-3 border-b border-border last:border-0 items-center">
              <div>
                <div className="text-[12.5px] font-medium text-fg">{label}</div>
                <div className="text-[11px] text-fg-3">{sub}</div>
              </div>
              {(['app','email','push'] as const).map(ch => (
                <div key={ch} className="flex justify-center">
                  <Toggle
                    checked={row[ch]}
                    onChange={v => setState(s => ({ ...s, [k]: { ...s[k], [ch]: v } }))}
                  />
                </div>
              ))}
            </div>
          );
        })}
      </Card>

      <Card>
        <CardHeader><CardTitle>방해 금지 모드</CardTitle></CardHeader>
        <CardBody className="space-y-1">
          <Row label="평일 야간" sub="22:00 ~ 08:00 · 푸시 알림 차단"><Toggle checked={true} onChange={()=>{}} /></Row>
          <Row label="주말 종일" sub="긴급 (P0) 만 허용"><Toggle checked={true} onChange={()=>{}} /></Row>
          <Row label="회의 중 자동 차단" sub="캘린더에 회의가 있는 동안"><Toggle checked={false} onChange={()=>{}} /></Row>
        </CardBody>
      </Card>
    </Section>
  );
}

/* Security ------------------------------------------------------------- */
function SecuritySection() {
  const [showApi, setShowApi] = useState(false);
  return (
    <Section title="보안 / 세션" desc="비밀번호 · MFA · 활성 세션을 관리합니다.">
      <Card>
        <CardBody className="space-y-1">
          <Row label="비밀번호" sub="최근 변경: 2025년 11월 14일 (164일 전)">
            <Button size="sm" variant="secondary">변경</Button>
          </Row>
          <Row label="2단계 인증 (MFA)" sub="Authenticator 앱으로 활성화됨">
            <Badge tone="success"><Check size={10} /> 활성화</Badge>
            <Button size="sm" variant="ghost">설정</Button>
          </Row>
          <Row label="복구 코드" sub="MFA 분실 시 사용 · 8개 중 6개 미사용">
            <Button size="sm" variant="secondary">코드 보기</Button>
          </Row>
          <Row label="API 키" sub="자동화 / CLI 도구용">
            <code className="text-[11px] mono px-2 py-1 rounded bg-bg-1 border border-border text-fg-2">
              {showApi ? 'sk_live_8f3a92...e45c' : '•••••••••••••••••••'}
            </code>
            <IconButton size="sm" onClick={() => setShowApi(s => !s)}>
              {showApi ? <EyeOff size={12} /> : <Eye size={12} />}
            </IconButton>
            <Button size="sm" variant="ghost">재발급</Button>
          </Row>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>활성 세션</CardTitle>
          <Button size="sm" variant="secondary">모든 다른 세션 종료</Button>
        </CardHeader>
        <CardBody className="space-y-1">
          {[
            { device: 'MacBook Pro · Chrome',  loc: '서울, 대한민국', ip: '125.232.•.•', last: '지금', icon: Monitor, current: true },
            { device: 'iPhone 15 Pro · iOS App', loc: '서울, 대한민국', ip: '125.232.•.•', last: '12분 전', icon: Smartphone },
            { device: 'iPad Pro · Safari',    loc: '판교, 대한민국', ip: '203.241.•.•', last: '3시간 전', icon: Monitor },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="flex items-center gap-3 py-3 border-b border-border last:border-0">
                <div className="w-9 h-9 rounded-md grid place-items-center bg-bg-1 border border-border">
                  <Icon size={14} className="text-fg-2" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[12.5px] font-semibold text-fg">{s.device}</span>
                    {s.current && <Badge tone="accent">현재</Badge>}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-fg-3 mt-0.5">
                    <MapPin size={10} /><span>{s.loc}</span>
                    <span>·</span>
                    <span className="mono">{s.ip}</span>
                    <span>·</span>
                    <Clock size={10} /><span>{s.last}</span>
                  </div>
                </div>
                {!s.current && <Button size="sm" variant="ghost">종료</Button>}
              </div>
            );
          })}
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>최근 보안 활동</CardTitle></CardHeader>
        <CardBody className="space-y-2 text-[12px]">
          {[
            ['로그인 성공', 'Chrome / 서울', '오늘 09:01'],
            ['MFA 인증', 'Authenticator', '오늘 09:01'],
            ['비밀번호 변경', 'Chrome / 서울', '2025-11-14'],
            ['로그인 실패 (잘못된 비밀번호)', 'Unknown / 부산', '2025-11-12'],
          ].map(([k, where, time], i) => (
            <div key={i} className="flex items-center justify-between py-1">
              <div>
                <div className="text-fg-1">{k}</div>
                <div className="text-[11px] text-fg-3">{where}</div>
              </div>
              <div className="text-[11px] text-fg-3 mono">{time}</div>
            </div>
          ))}
        </CardBody>
      </Card>
    </Section>
  );
}

/* Appearance ----------------------------------------------------------- */
function AppearanceSection() {
  const theme = useUIStore(s => s.theme);
  const setTheme = useUIStore(s => s.setTheme);
  const accent = useUIStore(s => s.accent);
  const setAccent = useUIStore(s => s.setAccent);

  const accents = ['blue','indigo','violet','teal','amber','rose'] as const;

  return (
    <Section title="외관" desc="테마 · 액센트 · 글자 크기를 조정합니다.">
      <Card>
        <CardHeader><CardTitle>테마</CardTitle></CardHeader>
        <CardBody>
          <div className="grid grid-cols-3 gap-3">
            {(['light','dark'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`p-4 rounded-lg border text-left transition-colors ${theme === t ? 'border-accent ring-2 ring-accent/30' : 'border-border hover:border-border-strong'}`}
              >
                <div className={`h-16 rounded mb-3 ${t === 'light' ? 'bg-white border border-zinc-200' : 'bg-zinc-900'}`} />
                <div className="text-[12.5px] font-semibold text-fg capitalize">{t === 'light' ? '라이트' : '다크'}</div>
              </button>
            ))}
            <button className="p-4 rounded-lg border border-border hover:border-border-strong text-left">
              <div className="h-16 rounded mb-3 bg-gradient-to-r from-white via-zinc-200 to-zinc-900" />
              <div className="text-[12.5px] font-semibold text-fg">시스템 따라가기</div>
            </button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>액센트 컬러</CardTitle></CardHeader>
        <CardBody>
          <div className="flex items-center gap-3">
            {accents.map(a => (
              <button
                key={a}
                onClick={() => setAccent(a)}
                data-accent={a}
                className={`w-10 h-10 rounded-full bg-accent transition-transform ${accent === a ? 'ring-2 ring-offset-2 ring-offset-bg ring-accent scale-110' : 'hover:scale-105'}`}
                title={a}
              />
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-1">
          <Row label="글자 크기" sub="앱 전체 텍스트 크기를 조정합니다.">
            <select className="h-8 px-2.5 rounded-md bg-bg-1 border border-border text-[12.5px]">
              <option>작게 (90%)</option>
              <option>표준 (100%)</option>
              <option>크게 (110%)</option>
              <option>매우 크게 (120%)</option>
            </select>
          </Row>
          <Row label="컴팩트 모드" sub="여백을 줄여 더 많은 정보를 표시합니다."><Toggle checked={false} onChange={()=>{}} /></Row>
          <Row label="모션 줄이기" sub="애니메이션을 최소화합니다."><Toggle checked={false} onChange={()=>{}} /></Row>
        </CardBody>
      </Card>
    </Section>
  );
}

/* Language ------------------------------------------------------------- */
function LanguageSection() {
  return (
    <Section title="언어 / 시간대">
      <Card>
        <CardBody className="space-y-1">
          <Row label="앱 언어">
            <select className="h-8 px-2.5 rounded-md bg-bg-1 border border-border text-[12.5px]">
              <option>한국어</option>
              <option>English</option>
              <option>日本語</option>
            </select>
          </Row>
          <Row label="시간대">
            <select className="h-8 px-2.5 rounded-md bg-bg-1 border border-border text-[12.5px]">
              <option>(UTC+09:00) 서울</option>
              <option>(UTC+00:00) 런던</option>
              <option>(UTC-08:00) 샌프란시스코</option>
            </select>
          </Row>
          <Row label="날짜 형식">
            <select className="h-8 px-2.5 rounded-md bg-bg-1 border border-border text-[12.5px]">
              <option>2026년 4월 28일</option>
              <option>2026-04-28</option>
              <option>04/28/2026</option>
            </select>
          </Row>
          <Row label="주 시작 요일">
            <select className="h-8 px-2.5 rounded-md bg-bg-1 border border-border text-[12.5px]">
              <option>월요일</option>
              <option>일요일</option>
            </select>
          </Row>
        </CardBody>
      </Card>
    </Section>
  );
}

/* Shortcuts ------------------------------------------------------------ */
function ShortcutsSection() {
  const groups = [
    { name: '전역', items: [
      ['⌘ K', '빠른 검색'],
      ['⌘ /', '단축키 보기'],
      ['G + D', '대시보드로 이동'],
      ['G + T', '내 태스크로 이동'],
      ['G + I', '이슈로 이동'],
      ['?', '도움말'],
    ]},
    { name: '편집', items: [
      ['⌘ Enter', '저장 / 보내기'],
      ['Esc', '닫기 / 취소'],
      ['⌘ B / I / U', '굵게 / 기울임 / 밑줄'],
    ]},
    { name: '태스크', items: [
      ['N', '새 태스크'],
      ['⇧ Enter', '하위 태스크 추가'],
      ['1 ~ 5', '상태 변경'],
    ]},
  ];
  return (
    <Section title="단축키" desc="자주 쓰는 키보드 단축키 모음">
      {groups.map(g => (
        <Card key={g.name}>
          <CardHeader><CardTitle>{g.name}</CardTitle></CardHeader>
          <CardBody className="space-y-1">
            {g.items.map(([k, label], i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                <span className="text-[12.5px] text-fg-1">{label}</span>
                <kbd className="text-[11px] mono px-2 py-0.5 rounded bg-bg-1 border border-border text-fg">{k}</kbd>
              </div>
            ))}
          </CardBody>
        </Card>
      ))}
    </Section>
  );
}

/* Integrations --------------------------------------------------------- */
function IntegrationsSection() {
  const apps = [
    { n: 'Notion',           desc: '6개 DB 동기화', conn: true },
    { n: 'Google Calendar',  desc: '양방향 일정 sync', conn: true },
    { n: 'Slack',            desc: '알림 미러링', conn: true },
    { n: 'GitHub',           desc: 'PR / 이슈 활동', conn: true },
    { n: 'Figma',            desc: '디자인 임베드', conn: false },
    { n: 'Jira',             desc: '이슈 가져오기', conn: false },
    { n: 'Microsoft Teams',  desc: '회의 / 메시지', conn: false },
    { n: 'Zoom',             desc: '회의 자동 녹화 → 회의록', conn: false },
  ];
  return (
    <Section title="연결된 앱" desc="외부 도구와의 통합을 관리합니다.">
      <div className="grid grid-cols-2 gap-3">
        {apps.map(a => (
          <Card key={a.n} hoverable>
            <CardBody className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-bg-1 border border-border grid place-items-center text-[14px] font-bold text-fg-2">
                {a.n[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px] font-semibold text-fg">{a.n}</div>
                <div className="text-[11px] text-fg-3 truncate">{a.desc}</div>
              </div>
              {a.conn ? (
                <Button size="sm" variant="secondary">관리</Button>
              ) : (
                <Button size="sm" variant="primary">연결</Button>
              )}
            </CardBody>
          </Card>
        ))}
      </div>
    </Section>
  );
}

/* Danger --------------------------------------------------------------- */
function DangerSection() {
  return (
    <Section title="계정 삭제" desc="이 작업은 되돌릴 수 없습니다.">
      <Card className="border-danger/40">
        <CardBody className="space-y-3">
          <div className="text-[13px] text-fg-1 leading-relaxed">
            계정을 삭제하면 다음 데이터가 영구적으로 제거됩니다:
            <ul className="list-disc ml-5 mt-2 space-y-1 text-fg-2 text-[12px]">
              <li>프로필 · 설정 · 단축키 · 알림 환경설정</li>
              <li>업로드한 파일 · 첨부 · 댓글</li>
              <li>1:1 미팅 노트 · 평가 셀프 작성분</li>
            </ul>
            <div className="text-fg-3 text-[11.5px] mt-2">
              ※ 워크스페이스 공통 데이터(프로젝트·태스크·이슈)는 익명 처리되어 보존됩니다.
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button size="md" variant="danger"><Trash2 size={13} /> 계정 영구 삭제</Button>
          </div>
        </CardBody>
      </Card>
    </Section>
  );
}
