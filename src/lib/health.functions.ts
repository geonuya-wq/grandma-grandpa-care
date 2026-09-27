import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const LogSchema = z.object({
  date: z.string(),
  dose: z.string(),
  taken: z.boolean(),
  condition: z.string(),
  symptoms: z.array(z.string()),
  note: z.string(),
});

export interface HealthReport {
  summary: string;
  alerts: { level: "주의" | "관찰" | "양호"; text: string }[];
  tip: string;
}

export const analyzeHealthLogs = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ logs: z.array(LogSchema).max(200) }).parse(d))
  .handler(async ({ data }): Promise<{ report?: HealthReport; error?: string }> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { error: "AI 설정이 되어 있지 않아요." };

    const prompt = `당신은 멀리 사는 자녀에게 부모님의 복약·컨디션 기록을 요약해주는 따뜻한 건강 도우미입니다.
의학적 진단은 하지 말고, 관찰된 변화와 병원 상담이 필요할 수 있는 신호만 알려주세요.
아래 JSON 기록(최근 기록)을 분석해 반드시 다음 JSON 형식으로만 답하세요(코드블록 없이):
{"summary":"2~3문장 한국어 요약","alerts":[{"level":"주의|관찰|양호","text":"한 문장"}],"tip":"자녀가 오늘 부모님께 해볼 수 있는 한 가지 행동(전화 멘트 등)"}
alerts는 최대 4개.

기록:
${JSON.stringify(data.logs)}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        input: prompt,
        stream: true,
        store: false,
        reasoning: { effort: "low", summary: "auto" },
        include: ["reasoning.encrypted_content"],
      }),
    });

    if (!res.ok || !res.body) {
      if (res.status === 429) return { error: "요청이 많아요. 잠시 후 다시 시도해주세요." };
      if (res.status === 402) return { error: "AI 사용 크레딧이 부족해요." };
      const t = await res.text().catch(() => "");
      console.error("AI gateway error", res.status, t);
      return { error: `분석에 실패했어요 (${res.status}).` };
    }

    // SSE 누적
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let text = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const ev = JSON.parse(payload);
          if (ev.type === "response.output_text.delta") text += ev.delta;
          if (ev.type === "error" || ev.type === "response.failed")
            return { error: "분석 중 오류가 발생했어요." };
        } catch {
          /* ignore */
        }
      }
    }

    try {
      const m = text.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(m ? m[0] : text) as HealthReport;
      return {
        report: {
          summary: String(parsed.summary ?? ""),
          alerts: Array.isArray(parsed.alerts) ? parsed.alerts.slice(0, 4) : [],
          tip: String(parsed.tip ?? ""),
        },
      };
    } catch {
      return { report: { summary: text.trim(), alerts: [], tip: "" } };
    }
  });
