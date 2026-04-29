#!/usr/bin/env node
/**
 * update-task-status.mjs — ALL-Flow Backend task 상태 업데이트 도구
 *
 * 사용법:
 *   node scripts/update-task-status.mjs T-001 in_progress
 *   node scripts/update-task-status.mjs T-001 done
 *   node scripts/update-task-status.mjs T-001 blocked --note "DB 연결 실패"
 *
 * 동작:
 *   1) .bkit/state/features/all-flow-backend/tasks.json 의 해당 태스크 상태 변경
 *   2) started_at / completed_at 자동 기록
 *   3) progress.md 자동 재생성 (체크박스 + Phase별 % + 진행률 바)
 *   4) tasks.json _meta 카운터 갱신
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..', '..');
const TASKS_PATH = resolve(REPO_ROOT, '.bkit/state/features/all-flow-backend/tasks.json');
const PROGRESS_PATH = resolve(REPO_ROOT, '.bkit/state/features/all-flow-backend/progress.md');

const VALID_STATUSES = ['todo', 'in_progress', 'review', 'done', 'blocked'];

function fail(msg) {
  console.error(`[update-task-status] ${msg}`);
  process.exit(1);
}

const [, , taskId, status, ...rest] = process.argv;
if (!taskId || !status) fail('사용법: update-task-status.mjs <T-XXX> <status> [--note "..."]');
if (!VALID_STATUSES.includes(status)) fail(`status는 ${VALID_STATUSES.join('|')} 중 하나`);

const noteIdx = rest.indexOf('--note');
const note = noteIdx >= 0 ? rest[noteIdx + 1] : null;

if (!existsSync(TASKS_PATH)) fail(`tasks.json 없음: ${TASKS_PATH}`);
const data = JSON.parse(readFileSync(TASKS_PATH, 'utf8'));
const task = data.tasks.find((t) => t.id === taskId);
if (!task) fail(`태스크 ${taskId} 없음`);

const now = new Date().toISOString();
const prev = task.status;
task.status = status;
if (status === 'in_progress' && !task.started_at) task.started_at = now;
if (status === 'done') task.completed_at = now;
if (note) task.note = note;

// 카운터 재계산
const counts = { done: 0, in_progress: 0, review: 0, blocked: 0, todo: 0 };
for (const t of data.tasks) counts[t.status] = (counts[t.status] ?? 0) + 1;
data._meta.done = counts.done;
data._meta.in_progress = counts.in_progress;
data._meta.todo = counts.todo;
data._meta.updated = now.slice(0, 10);

writeFileSync(TASKS_PATH, JSON.stringify(data, null, 2) + '\n');
console.log(`[ok] ${taskId}: ${prev} → ${status}`);

// progress.md 재생성
function bar(done, total, width = 20) {
  const filled = total === 0 ? 0 : Math.round((done / total) * width);
  return '[' + '█'.repeat(filled) + '░'.repeat(width - filled) + `] ${done}/${total}`;
}
function statusGlyph(s) {
  return (
    { todo: '[ ]', in_progress: '[~]', review: '[r]', done: '[x]', blocked: '[!]' }[s] ?? '[?]'
  );
}

const total = data.tasks.length;
const phases = data.phases;
const phaseStats = {};
for (const t of data.tasks) {
  const p = t.phase;
  phaseStats[p] ??= { done: 0, total: 0 };
  phaseStats[p].total += 1;
  if (t.status === 'done') phaseStats[p].done += 1;
}

let md = `# Progress — ALL-Flow Backend\n\n`;
md += `> 마지막 업데이트: ${now} (자동 갱신)\n`;
md += `> 데이터 소스: \`tasks.json\`\n\n`;
md += `## 요약\n\n`;
md += `| 지표 | 값 |\n|------|---:|\n`;
md += `| 전체 태스크 | ${total} |\n`;
md += `| done | ${counts.done} |\n`;
md += `| in_progress | ${counts.in_progress} |\n`;
md += `| review | ${counts.review} |\n`;
md += `| blocked | ${counts.blocked} |\n`;
md += `| todo | ${counts.todo} |\n`;
md += `| 진행률 | ${total === 0 ? 0 : Math.round((counts.done / total) * 100)}% |\n\n`;
md += '```\n' + bar(counts.done, total) + '\n```\n\n';

md += `## Phase별 진행률\n\n`;
md += `| Phase | 이름 | done / total | % |\n|------:|------|-------------:|--:|\n`;
for (const [p, name] of Object.entries(phases)) {
  const s = phaseStats[p] ?? { done: 0, total: 0 };
  const pct = s.total === 0 ? 0 : Math.round((s.done / s.total) * 100);
  md += `| ${p} | ${name} | ${s.done}/${s.total} | ${pct}% |\n`;
}
md += `\n## 태스크 보드\n\n`;
for (const [p, name] of Object.entries(phases)) {
  md += `### Phase ${p} — ${name}\n`;
  for (const t of data.tasks.filter((x) => String(x.phase) === String(p))) {
    const deps = t.deps?.length ? `  (deps: ${t.deps.join(', ')})` : '';
    md += `- ${statusGlyph(t.status)} ${t.id}  ${t.title} — ${t.owner}${deps}\n`;
  }
  md += `\n`;
}

writeFileSync(PROGRESS_PATH, md);
console.log(`[ok] progress.md 재생성`);
