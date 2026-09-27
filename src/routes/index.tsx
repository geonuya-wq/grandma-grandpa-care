import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Camera,
  Check,
  Clock,
  Home,
  ImagePlus,
  MessageCircle,
  Pill,
  Sparkles,
  X,
} from "lucide-react";
import { analyzeHealthLogs, type HealthReport } from "@/lib/health.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "효도약속 — 멀리 계신 부모님 복약·병원 일정 챙기기" },
      {
        name: "description",
        content:
          "멀리 계신 부모님의 복약과 병원 일정을 자녀가 함께 챙기는 모바일 앱. 약봉투 사진 한 장으로 복약 일정을 등록하세요.",
      },
      { property: "og:title", content: "효도약속 — 부모님 복약 챙기기" },
      {
        property: "og:description",
        content:
          "약봉투 사진 한 장으로 부모님 복약 일정을 등록하고, 카톡으로 복약 확인을 받아보세요.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

type DoseStatus = "done" | "waiting" | "scheduled";

interface Dose {
  id: string;
  label: string;
  time: string;
  status: DoseStatus;
}

const INITIAL_DOSES: Dose[] = [
  { id: "morning", label: "아침 식후", time: "08:30", status: "done" },
  { id: "lunch", label: "점심 식후", time: "12:30", status: "waiting" },
  { id: "evening", label: "저녁 식후", time: "18:30", status: "scheduled" },
];

const TODAY = new Date(2026, 8, 27);

interface Appointment {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string;
  place: string;
  memo: string;
}

const APPOINTMENTS: Appointment[] = [
  { id: "a1", title: "튼튼내과 정기 검진", date: "2026-10-02", time: "오전 10:00", place: "튼튼내과", memo: "혈압·당뇨 상담" },
  { id: "a2", title: "밝은눈안과 백내장 검사", date: "2026-10-15", time: "오후 2:30", place: "밝은눈안과", memo: "보호자 동행 권장" },
];

function daysUntil(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return Math.round((new Date(y, m - 1, d).getTime() - TODAY.getTime()) / 86400000);
}
function fmtDate(date: string) {
  const [, m, d] = date.split("-").map(Number);
  return `${m}월 ${d}일`;
}

interface ConditionLog {
  date: string;
  dose: string;
  taken: boolean;
  condition: string;
  symptoms: string[];
  note: string;
}

const PAST_LOGS: ConditionLog[] = [
  { date: "09-21", dose: "아침", taken: true, condition: "좋음", symptoms: [], note: "" },
  { date: "09-22", dose: "아침", taken: true, condition: "좋음", symptoms: [], note: "산책했어" },
  { date: "09-23", dose: "점심", taken: false, condition: "보통", symptoms: ["피로"], note: "깜빡했네" },
  { date: "09-24", dose: "아침", taken: true, condition: "보통", symptoms: ["어지러움"], note: "아침에 일어날 때 핑 돌아" },
  { date: "09-25", dose: "아침", taken: true, condition: "안좋음", symptoms: ["어지러움", "잠 못잠"], note: "" },
  { date: "09-26", dose: "저녁", taken: true, condition: "보통", symptoms: ["어지러움"], note: "" },
  { date: "09-27", dose: "아침", taken: true, condition: "보통", symptoms: [], note: "" },
];

const REMINDER_OPTIONS = [
  { id: "d3", label: "3일 전", days: 3 },
  { id: "d1", label: "하루 전", days: 1 },
  { id: "d0", label: "당일 아침", days: 0 },
];

const CONFETTI_COLORS = ["#8fd6a8", "#f6c98f", "#f9e08a", "#a8d8f0", "#f2a9a9"];

function Confetti() {
  const pieces = Array.from({ length: 36 });
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((_, i) => (
        <span
          key={i}
          className="absolute block rounded-sm"
          style={{
            left: `${(i * 37) % 100}%`,
            top: "-4vh",
            width: `${6 + (i % 4) * 3}px`,
            height: `${10 + (i % 3) * 4}px`,
            backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            animation: `confetti-fall ${1.6 + (i % 5) * 0.25}s ease-in ${(i % 8) * 0.08}s both`,
          }}
        />
      ))}
    </div>
  );
}

function ProgressRing({ done, total }: { done: number; total: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const pct = total === 0 ? 0 : done / total;
  return (
    <div className="relative h-24 w-24">
      <svg viewBox="0 0 84 84" className="h-full w-full -rotate-90">
        <circle
          cx="42"
          cy="42"
          r={r}
          fill="none"
          strokeWidth="9"
          className="stroke-secondary"
        />
        <circle
          cx="42"
          cy="42"
          r={r}
          fill="none"
          strokeWidth="9"
          strokeLinecap="round"
          className="stroke-primary transition-all duration-700"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-foreground">
          {done}/{total}
        </span>
        <span className="text-[10px] text-muted-foreground">완료</span>
      </div>
    </div>
  );
}

function DoseIcon({ status }: { status: DoseStatus }) {
  if (status === "done")
    return (
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Check className="h-5 w-5" strokeWidth={3} />
      </div>
    );
  if (status === "waiting")
    return (
      <div className="animate-soft-pulse flex h-9 w-9 items-center justify-center rounded-full bg-sunshine text-accent-foreground">
        <Clock className="h-5 w-5" />
      </div>
    );
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
      <Pill className="h-4 w-4" />
    </div>
  );
}

function StatusBadge({ status }: { status: DoseStatus }) {
  if (status === "done")
    return (
      <span className="rounded-full bg-leaf-soft px-2.5 py-1 text-xs font-semibold text-secondary-foreground">
        완료 ✓
      </span>
    );
  if (status === "waiting")
    return (
      <span className="rounded-full bg-sunshine px-2.5 py-1 text-xs font-semibold text-accent-foreground">
        부모님 대기중
      </span>
    );
  return (
    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
      예정
    </span>
  );
}

/* ---------------- 약봉투 등록 모달 ---------------- */

function UploadModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [phase, setPhase] = useState<"pick" | "analyzing" | "result">("pick");
  const [preview, setPreview] = useState<string | null>(null);
  const [times, setTimes] = useState({ 아침: true, 점심: true, 저녁: true });
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const handleFile = (file?: File | null) => {
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setPhase("analyzing");
  };

  useEffect(() => {
    if (phase !== "analyzing") return;
    const t = setTimeout(() => setPhase("result"), 3000);
    return () => clearTimeout(t);
  }, [phase]);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-foreground/40">
      <div className="animate-slide-up max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-card p-6 pb-10 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold">약봉투 사진으로 빠른 등록</h2>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="rounded-full bg-muted p-2 text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {phase === "pick" && (
          <div className="space-y-3">
            <button
              onClick={() => cameraRef.current?.click()}
              className="flex w-full items-center gap-4 rounded-2xl bg-primary p-5 text-left text-primary-foreground active:scale-[0.98] transition-transform"
            >
              <Camera className="h-7 w-7" />
              <div>
                <p className="font-bold">카메라로 촬영하기</p>
                <p className="text-xs opacity-80">약봉투 앞면을 촬영해주세요</p>
              </div>
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex w-full items-center gap-4 rounded-2xl bg-secondary p-5 text-left text-secondary-foreground active:scale-[0.98] transition-transform"
            >
              <ImagePlus className="h-7 w-7" />
              <div>
                <p className="font-bold">앨범에서 선택하기</p>
                <p className="text-xs opacity-70">저장된 사진을 불러옵니다</p>
              </div>
            </button>
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>
        )}

        {phase === "analyzing" && (
          <div className="flex flex-col items-center py-10">
            {preview && (
              <img
                src={preview}
                alt="약봉투 사진"
                className="mb-6 h-36 w-36 rounded-2xl object-cover shadow-md"
              />
            )}
            <div className="animate-spin-slow mb-4 h-10 w-10 rounded-full border-4 border-secondary border-t-primary" />
            <p className="font-semibold">AI가 약봉투를 분석하고 있어요…</p>
            <p className="mt-1 text-xs text-muted-foreground">
              약 이름과 복용 시간을 읽는 중입니다
            </p>
          </div>
        )}

        {phase === "result" && (
          <div className="animate-pop-in space-y-4">
            <div className="rounded-2xl bg-warm p-4">
              <p className="text-xs text-muted-foreground">처방 기관</p>
              <p className="font-bold">튼튼내과 · 행복약국</p>
              <p className="mt-2 text-xs text-muted-foreground">처방 기간</p>
              <p className="font-bold">7일분 (9/27 ~ 10/3)</p>
            </div>

            <div className="rounded-2xl bg-card p-4 shadow-sm">
              <p className="mb-2 text-sm font-semibold">복용 시간</p>
              <div className="flex gap-2">
                {(["아침", "점심", "저녁"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTimes((s) => ({ ...s, [t]: !s[t] }))}
                    className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                      times[t]
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {t} {times[t] ? "✓" : ""}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-card p-4 shadow-sm">
              <p className="mb-2 text-sm font-semibold">인식된 약 (3종)</p>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li>• 아모디핀정 5mg (혈압약)</li>
                <li>• 메트포르민정 500mg (당뇨약)</li>
                <li>• 가스모틴정 (소화제)</li>
              </ul>
            </div>

            <button
              onClick={onSaved}
              className="w-full rounded-2xl bg-primary py-4 font-bold text-primary-foreground active:scale-[0.98] transition-transform"
            >
              캘린더에 일정 저장
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- 부모님 카톡 시뮬레이터 ---------------- */

const CONDITIONS = [
  { v: "좋음", e: "😊" },
  { v: "보통", e: "🙂" },
  { v: "안좋음", e: "😣" },
];
const SYMPTOMS = ["어지러움", "두통", "속쓰림", "피로", "잠 못잠", "붓기", "기침"];

function ConditionForm({ onSubmit }: { onSubmit: (c: string, s: string[], n: string) => void }) {
  const [cond, setCond] = useState<string | null>(null);
  const [sym, setSym] = useState<string[]>([]);
  const [note, setNote] = useState("");
  return (
    <div className="animate-pop-in overflow-hidden rounded-2xl bg-white p-5 shadow-lg">
      <p className="text-lg font-bold text-gray-800">오늘 몸은 어떠세요?</p>
      <div className="mt-3 flex gap-2">
        {CONDITIONS.map((c) => (
          <button
            key={c.v}
            onClick={() => setCond(c.v)}
            className={`flex flex-1 flex-col items-center rounded-2xl py-3 text-base font-bold ${
              cond === c.v ? "bg-primary text-primary-foreground" : "bg-gray-100 text-gray-700"
            }`}
          >
            <span className="text-3xl">{c.e}</span>
            {c.v}
          </button>
        ))}
      </div>
      <p className="mt-4 text-sm font-semibold text-gray-600">불편한 곳이 있으면 눌러주세요</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {SYMPTOMS.map((s) => (
          <button
            key={s}
            onClick={() => setSym((x) => (x.includes(s) ? x.filter((y) => y !== s) : [...x, s]))}
            className={`rounded-full px-4 py-2 text-base font-semibold ${
              sym.includes(s) ? "bg-sunshine text-accent-foreground" : "bg-gray-100 text-gray-600"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="하고 싶은 말 (선택)"
        className="mt-3 w-full rounded-xl bg-gray-100 px-4 py-3 text-base text-gray-800 outline-none"
      />
      <button
        disabled={!cond}
        onClick={() => cond && onSubmit(cond, sym, note)}
        className="mt-4 w-full rounded-2xl bg-primary py-5 text-xl font-bold text-primary-foreground disabled:opacity-50"
      >
        자녀에게 보내기 💌
      </button>
    </div>
  );
}

function KakaoSimulator({
  onConfirm,
  onCondition,
  appointment,
}: {
  onConfirm: () => void;
  onCondition: (c: string, s: string[], n: string) => void;
  appointment: Appointment;
}) {
  const [answered, setAnswered] = useState<"none" | "done" | "snooze">("none");
  const [condSent, setCondSent] = useState(false);
  const [apptOk, setApptOk] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col" style={{ backgroundColor: "#9bbbd4" }}>
      {/* 카톡 스타일 헤더 */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-lg">
          🌷
        </div>
        <div>
          <p className="text-sm font-bold" style={{ color: "#22343f" }}>효도약속 알림봇</p>
          <p className="text-[10px]" style={{ color: "#4a6070" }}>카카오톡 알림톡 시뮬레이션</p>
        </div>
      </div>

      <div className="flex-1 space-y-4 px-4 py-6 pb-28">
        <p className="text-center text-[11px]" style={{ color: "#3d5568" }}>
          오늘 오전 9:00
        </p>

        {/* 병원 예약 알림 */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-lg">
          <div className="bg-sunshine px-5 py-3">
            <p className="text-xs font-bold text-accent-foreground">🏥 병원 예약 알림</p>
          </div>
          <div className="px-5 py-5">
            <p className="text-xl font-bold leading-relaxed text-gray-800">
              어머니, {daysUntil(appointment.date)}일 뒤<br />
              {appointment.title} 가시는 날이에요
            </p>
            <p className="mt-2 text-base text-gray-600">
              {fmtDate(appointment.date)} {appointment.time} · {appointment.place}
            </p>
            <p className="mt-1 text-sm text-gray-500">건강보험증과 드시는 약을 챙겨주세요.</p>
            <button
              onClick={() => setApptOk(true)}
              disabled={apptOk}
              className="mt-4 w-full rounded-2xl bg-primary py-4 text-lg font-bold text-primary-foreground disabled:opacity-60"
            >
              {apptOk ? "확인했어요 ✓" : "알겠어요 👌"}
            </button>
          </div>
        </div>

        <p className="text-center text-[11px]" style={{ color: "#3d5568" }}>
          오늘 오후 12:30
        </p>

        {/* 알림톡 카드 */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-lg">
          <div className="bg-leaf-soft px-5 py-3">
            <p className="text-xs font-bold text-secondary-foreground">
              💊 복약 알림
            </p>
          </div>
          <div className="px-5 py-6">
            <p className="text-xl font-bold leading-relaxed text-gray-800">
              어머니, 점심 약<br />
              드실 시간이에요!
            </p>
            <p className="mt-2 text-sm text-gray-500">
              식후 30분 안에 드시면 좋아요.
            </p>
          </div>
          {answered === "done" && (
            <div className="animate-pop-in mx-5 mb-4 rounded-xl bg-leaf-soft px-4 py-3 text-center text-sm font-bold text-secondary-foreground">
              잘하셨어요! 자녀분께 전달했어요 💚
            </div>
          )}
          {answered === "snooze" && (
            <div className="animate-pop-in mx-5 mb-4 rounded-xl bg-sunshine px-4 py-3 text-center text-sm font-bold text-accent-foreground">
              30분 뒤에 다시 알려드릴게요 ⏰
            </div>
          )}
        </div>

        {/* 초대형 버튼 2개 */}
        <div className="space-y-3 pt-2">
          <button
            onClick={() => {
              setAnswered("done");
              onConfirm();
            }}
            disabled={answered === "done"}
            className="w-full rounded-3xl bg-primary py-7 text-2xl font-bold text-primary-foreground shadow-xl active:scale-[0.97] transition-transform disabled:opacity-60"
          >
            약 먹었어요 👍
          </button>
          <button
            onClick={() => setAnswered("snooze")}
            disabled={answered === "done"}
            className="w-full rounded-3xl bg-white py-7 text-2xl font-bold text-gray-700 shadow-xl active:scale-[0.97] transition-transform disabled:opacity-60"
          >
            30분 뒤 다시 알림 ⏰
          </button>
        </div>

        {answered === "done" && !condSent && (
          <ConditionForm
            onSubmit={(c, s, n) => {
              setCondSent(true);
              onCondition(c, s, n);
            }}
          />
        )}
        {condSent && (
          <div className="animate-pop-in rounded-2xl bg-white px-5 py-4 text-center text-base font-bold text-gray-700 shadow-lg">
            컨디션을 자녀분께 전달했어요 💌
          </div>
        )}

        <p className="pt-4 text-center text-xs" style={{ color: "#3d5568" }}>
          ※ 실제 부모님 카톡 화면을 시뮬레이션한 화면입니다
        </p>
      </div>
    </div>
  );
}

/* ---------------- 메인 ---------------- */

function Index() {
  const [doses, setDoses] = useState<Dose[]>(INITIAL_DOSES);
  const [tab, setTab] = useState<"home" | "kakao">("home");
  const [showUpload, setShowUpload] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [logs, setLogs] = useState<ConditionLog[]>(PAST_LOGS);
  const [report, setReport] = useState<HealthReport | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reminders, setReminders] = useState<Record<string, boolean>>({ d3: true, d1: true, d0: true });
  const [notifyParent, setNotifyParent] = useState(true);
  const analyze = useServerFn(analyzeHealthLogs);

  const doneCount = doses.filter((d) => d.status === "done").length;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const confirmLunch = () => {
    setDoses((ds) =>
      ds.map((d) => (d.id === "lunch" ? { ...d, status: "done" } : d)),
    );
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 2800);
    showToast("어머니가 점심 약을 드셨어요! 💚");
  };

  const addCondition = (condition: string, symptoms: string[], note: string) => {
    setLogs((l) => [...l, { date: "09-27", dose: "점심", taken: true, condition, symptoms, note }]);
    setReport(null);
    showToast(`어머니 컨디션: ${condition}${symptoms.length ? ` · ${symptoms.join(", ")}` : ""}`);
  };

  const runAnalysis = async () => {
    setAnalyzing(true);
    setReportError(null);
    try {
      const r = await analyze({ data: { logs } });
      if (r.error) setReportError(r.error);
      else if (r.report) setReport(r.report);
    } catch {
      setReportError("분석에 실패했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setAnalyzing(false);
    }
  };

  const nextAppt = APPOINTMENTS[0];
  const nextDays = daysUntil(nextAppt.date);

  const testNotification = async () => {
    const body = `${fmtDate(nextAppt.date)} ${nextAppt.time} ${nextAppt.title} (D-${nextDays})`;
    if (typeof Notification !== "undefined") {
      const perm = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
      if (perm === "granted") {
        new Notification("🏥 병원 예약 알림", { body });
        return;
      }
    }
    showToast(`🏥 ${body}`);
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-background">
      {showConfetti && <Confetti />}

      {toast && (
        <div className="animate-pop-in fixed left-1/2 top-6 z-50 -translate-x-1/2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background shadow-xl">
          {toast}
        </div>
      )}

      {tab === "home" ? (
        <>
          {/* 헤더 */}
          <header className="px-5 pt-12">
            <p className="text-xs text-muted-foreground">9월 27일 일요일</p>
            <h1 className="mt-1 text-2xl font-bold">
              엄마 🌸 <span className="text-base font-medium text-muted-foreground">오늘도 화이팅!</span>
            </h1>
          </header>

          {/* 진행률 카드 */}
          <section className="mx-5 mt-5 flex items-center justify-between rounded-3xl bg-card p-5 shadow-sm">
            <div>
              <p className="text-sm font-semibold text-muted-foreground">
                오늘의 복약
              </p>
              <p className="mt-1 text-xl font-bold">
                {doneCount === doses.length
                  ? "오늘 약 완료! 🎉"
                  : `${doses.length - doneCount}번 남았어요`}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                다음: 저녁 식후 18:30
              </p>
            </div>
            <ProgressRing done={doneCount} total={doses.length} />
          </section>

          {/* 복약 타임라인 */}
          <section className="mx-5 mt-5 rounded-3xl bg-card p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-bold">오늘 복약 타임라인</h2>
            <div className="space-y-1">
              {doses.map((dose, i) => (
                <div key={dose.id} className="relative flex gap-4 pb-5 last:pb-0">
                  {i < doses.length - 1 && (
                    <div className="absolute left-[17px] top-10 h-[calc(100%-28px)] w-0.5 bg-border" />
                  )}
                  <DoseIcon status={dose.status} />
                  <div className="flex flex-1 items-center justify-between">
                    <div>
                      <p className="font-semibold">{dose.label}</p>
                      <p className="text-xs text-muted-foreground">{dose.time}</p>
                    </div>
                    <StatusBadge status={dose.status} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* AI 건강 리포트 */}
          <section className="mx-5 mt-5 rounded-3xl bg-card p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-sm font-bold">
                <Sparkles className="h-4 w-4 text-leaf" /> AI 컨디션 리포트
              </h2>
              <span className="text-[11px] text-muted-foreground">기록 {logs.length}건</span>
            </div>
            <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
              {logs.slice(-7).map((l, i) => (
                <div key={i} className="flex min-w-[44px] flex-col items-center rounded-xl bg-muted px-2 py-1.5">
                  <span className="text-lg">
                    {l.condition === "좋음" ? "😊" : l.condition === "보통" ? "🙂" : "😣"}
                  </span>
                  <span className="text-[9px] text-muted-foreground">{l.date.slice(3)}일</span>
                  {!l.taken && <span className="text-[9px] font-bold text-destructive">미복용</span>}
                </div>
              ))}
            </div>
            {report ? (
              <div className="animate-pop-in space-y-2.5">
                <p className="text-sm leading-relaxed">{report.summary}</p>
                {report.alerts.map((a, i) => (
                  <div
                    key={i}
                    className={`rounded-xl px-3 py-2 text-xs leading-relaxed ${
                      a.level === "주의"
                        ? "bg-destructive/10 text-destructive"
                        : a.level === "관찰"
                          ? "bg-sunshine text-accent-foreground"
                          : "bg-leaf-soft text-secondary-foreground"
                    }`}
                  >
                    <b>{a.level}</b> · {a.text}
                  </div>
                ))}
                {report.tip && (
                  <p className="rounded-xl bg-warm px-3 py-2 text-xs">💬 {report.tip}</p>
                )}
                <p className="text-[10px] text-muted-foreground">
                  ※ 참고용 요약이며 의학적 진단이 아니에요.
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                부모님이 남긴 컨디션·증상 기록을 분석해 주의할 변화를 알려드려요.
              </p>
            )}
            {reportError && <p className="mt-2 text-xs text-destructive">{reportError}</p>}
            <button
              onClick={runAnalysis}
              disabled={analyzing}
              className="mt-3 w-full rounded-2xl bg-secondary py-3 text-sm font-bold text-secondary-foreground disabled:opacity-60"
            >
              {analyzing ? "분석 중…" : report ? "다시 분석하기" : "기록 분석하기"}
            </button>
          </section>

          {/* 병원 일정 + 알림 */}
          <section className="mx-5 mt-5 rounded-3xl bg-warm p-5">
            <h2 className="mb-3 text-sm font-bold">다가오는 병원 일정</h2>
            {nextDays <= 5 && (
              <div className="mb-3 flex items-center gap-2 rounded-xl bg-sunshine px-3 py-2 text-xs font-semibold text-accent-foreground">
                <Bell className="h-4 w-4" /> D-{nextDays} · {nextAppt.title} 가 다가와요
              </div>
            )}
            <div className="space-y-3">
              {APPOINTMENTS.map((a) => {
                const [, m, d] = a.date.split("-").map(Number);
                return (
                  <div key={a.id} className="flex items-center gap-3">
                    <div className="flex h-11 w-11 flex-col items-center justify-center rounded-xl bg-card shadow-sm">
                      <span className="text-[9px] font-bold text-destructive">{m}월</span>
                      <span className="text-sm font-bold leading-none">{d}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{a.title}</p>
                      <p className="text-xs text-muted-foreground">{a.time} · {a.memo}</p>
                    </div>
                    <span className="text-xs font-bold text-leaf">D-{daysUntil(a.date)}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 rounded-2xl bg-card p-3">
              <p className="mb-2 text-xs font-semibold">미리 알림</p>
              <div className="flex gap-1.5">
                {REMINDER_OPTIONS.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setReminders((r) => ({ ...r, [o.id]: !r[o.id] }))}
                    className={`flex-1 rounded-lg py-2 text-xs font-semibold ${
                      reminders[o.id] ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <label className="mt-3 flex items-center justify-between text-xs">
                <span>부모님께도 카톡 알림 보내기</span>
                <input
                  type="checkbox"
                  checked={notifyParent}
                  onChange={(e) => setNotifyParent(e.target.checked)}
                  className="h-4 w-4 accent-[var(--primary)]"
                />
              </label>
              <button
                onClick={testNotification}
                className="mt-3 w-full rounded-xl bg-secondary py-2.5 text-xs font-bold text-secondary-foreground"
              >
                🔔 알림 미리 받아보기
              </button>
            </div>
          </section>

          <div className="h-32" />

          {/* FAB */}
          <button
            onClick={() => setShowUpload(true)}
            className="fixed bottom-24 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-primary px-6 py-4 font-bold text-primary-foreground shadow-xl active:scale-95 transition-transform"
          >
            <Camera className="h-5 w-5" />
            약봉투 사진으로 빠른 등록
          </button>
        </>
      ) : (
        <KakaoSimulator
          onConfirm={confirmLunch}
          onCondition={addCondition}
          appointment={nextAppt}
        />
      )}

      {/* 하단 탭 */}
      <nav className="fixed bottom-0 left-1/2 z-30 flex w-full max-w-md -translate-x-1/2 border-t border-border bg-card/95 backdrop-blur">
        <button
          onClick={() => setTab("home")}
          className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs font-semibold ${
            tab === "home" ? "text-leaf" : "text-muted-foreground"
          }`}
        >
          <Home className="h-5 w-5" />
          자녀 홈
        </button>
        <button
          onClick={() => setTab("kakao")}
          className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs font-semibold ${
            tab === "kakao" ? "text-leaf" : "text-muted-foreground"
          }`}
        >
          <MessageCircle className="h-5 w-5" />
          부모님 카톡 시뮬레이터
        </button>
      </nav>

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onSaved={() => {
            setShowUpload(false);
            setToast("복약 일정이 캘린더에 저장됐어요 📅");
            setTimeout(() => setToast(null), 3000);
          }}
        />
      )}
    </div>
  );
}
