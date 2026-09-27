import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Check,
  Clock,
  Home,
  ImagePlus,
  MessageCircle,
  Pill,
  X,
} from "lucide-react";

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

function KakaoSimulator({ onConfirm }: { onConfirm: () => void }) {
  const [answered, setAnswered] = useState<"none" | "done" | "snooze">("none");

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

      <div className="flex-1 space-y-4 px-4 py-6">
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

  const doneCount = doses.filter((d) => d.status === "done").length;

  const confirmLunch = () => {
    setDoses((ds) =>
      ds.map((d) => (d.id === "lunch" ? { ...d, status: "done" } : d)),
    );
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 2800);
    setToast("어머니가 점심 약을 드셨어요! 💚");
    setTimeout(() => setToast(null), 3000);
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

          {/* 병원 일정 */}
          <section className="mx-5 mt-5 rounded-3xl bg-warm p-5">
            <h2 className="mb-2 text-sm font-bold">다가오는 병원 일정</h2>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 flex-col items-center justify-center rounded-xl bg-card shadow-sm">
                <span className="text-[9px] font-bold text-destructive">10월</span>
                <span className="text-sm font-bold leading-none">2</span>
              </div>
              <div>
                <p className="text-sm font-semibold">튼튼내과 정기 검진</p>
                <p className="text-xs text-muted-foreground">오전 10:00 · 혈압·당뇨 상담</p>
              </div>
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
        <KakaoSimulator onConfirm={confirmLunch} />
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
