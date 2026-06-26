import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { decryptSecret } from '@/lib/crypto-utils';

// ─── Prompt templates per task type ───────────────────────────────────────────
function buildPrompt(task: string, context: Record<string, unknown>): string {
  const base = `Bạn là chuyên gia Business Analyst tại DEGO Holding, hỗ trợ team DX phân tích và viết tài liệu nghiệp vụ bằng tiếng Việt.
Chỉ trả về nội dung theo đúng định dạng yêu cầu, không giải thích thêm, không markdown header.`;

  switch (task) {
    case 'step1_steps':
      return `${base}
Quy trình: "${context.process_name}" — Bộ phận: ${context.department} — Người thực hiện: ${context.role}
Công cụ đang dùng: ${context.tools}

Hãy liệt kê 5-7 bước thực hiện quy trình theo thứ tự, mỗi bước gồm:
- Tên bước (ngắn gọn, rõ ràng)
- Công cụ dùng
- Thời gian ước tính

Trả về theo định dạng JSON array:
[{"step":"Tên bước","tool":"Công cụ","duration":"X phút"},...]`;

    case 'step1_pain_points':
      return `${base}
Quy trình: "${context.process_name}" — Bộ phận: ${context.department}
Công cụ: ${context.tools}
Các bước: ${context.steps}

Hãy phân tích và liệt kê 4-6 điểm đau (pain points) thực tế nhất của quy trình này.
Mỗi pain point phải cụ thể, có thể đo lường được (VD: "Copy dữ liệu thủ công mất 30 phút/ngày").
Trả về JSON array: ["pain point 1","pain point 2",...]`;

    case 'step2_questions':
      return `${base}
Quy trình cần phỏng vấn: "${context.process_name}"
Người được phỏng vấn: ${context.role} — Bộ phận: ${context.department}
Pain points đã biết: ${context.pain_points}

Hãy tạo 12 câu hỏi phỏng vấn sâu, phân loại đủ 4 nhóm:
- normal: câu hỏi về quy trình bình thường
- edge_case: câu hỏi về trường hợp ngoại lệ
- exception: câu hỏi về xử lý lỗi/ngoại lệ hệ thống
- approval_flow: câu hỏi về quy trình phê duyệt

Trả về JSON array: [{"question":"Câu hỏi?","category":"normal|edge_case|exception|approval_flow"},...]`;

    case 'step3_observations':
      return `${base}
Quy trình: "${context.process_name}" — Bộ phận: ${context.department}
Các bước: ${context.steps}
Pain points: ${context.pain_points}

Trong buổi shadowing/quan sát thực tế quy trình này, hãy liệt kê 6-8 hành động cần chú ý quan sát.
Phân loại theo: redundant (dư thừa), hidden (ẩn), manual (thủ công), workaround (vòng vèo), communication (giao tiếp)

Trả về JSON array: [{"observation":"Mô tả quan sát","action_type":"redundant|hidden|manual|workaround|communication","automation_potential":"high|medium|low"},...]`;

    case 'analysis_5w1h':
      return `${base}
Quy trình: "${context.process_name}"
Bộ phận: ${context.department} — Người thực hiện: ${context.role}
Bước thực hiện: ${context.steps}
Pain points: ${context.pain_points}
Câu hỏi phỏng vấn nổi bật: ${context.qa_highlights}

Hãy phân tích theo khung 5W1H để xây dựng yêu cầu hệ thống:
- What: Hệ thống/tính năng cần xây dựng là gì?
- Who: Ai sử dụng? (vai trò cụ thể)
- Where: Ở module/phần nào của hệ thống?
- When: Khi nào sử dụng? (trigger/điều kiện)
- Why: Tại sao cần? (lợi ích đo lường được)
- How+EdgeCases: Cách hoạt động + ít nhất 3 trường hợp ngoại lệ

Trả về JSON: {"what":"...","who":"...","where_field":"...","when_field":"...","why":"...","how_edge_cases":"..."}`;

    case 'backlog_story':
      return `${base}
Business Flow: "${context.business_flow}"
What: ${context.what}
Who: ${context.who}
Why: ${context.why}
How+EdgeCases: ${context.how_edge_cases}

Hãy viết 1 User Story hoàn chỉnh và 5-7 Acceptance Criteria.
User Story theo format: "Là [Vai trò cụ thể], tôi muốn [Hành động cụ thể], để [Lợi ích/Mục đích đo lường được]."
AC theo format: "- [Điều kiện cụ thể, có thể kiểm tra được]"

Trả về JSON: {"user_story":"Là...","acceptance_criteria":"- AC1\\n- AC2\\n...","priority":"P0-Core|P1-High|P2-NiceToHave"}`;

    case 'general':
      return `${base}\n${context.prompt as string}`;

    default:
      return `${base}\n${context.prompt as string}`;
  }
}

// ─── Call Gemini ──────────────────────────────────────────────────────────────
async function callGemini(apiKey: string, model: string, prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
    }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err?.error?.message || `Gemini API error ${res.status}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ─── Call Claude ──────────────────────────────────────────────────────────────
async function callClaude(apiKey: string, model: string, baseUrl: string, prompt: string): Promise<string> {
  const url = (baseUrl || 'https://api.anthropic.com') + '/v1/messages';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model || 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err?.error?.message || `Claude API error ${res.status}`);
  }
  const data = await res.json();
  return data.content?.[0]?.text || '';
}

// ─── Call OpenAI-compatible ──────────────────────────────────────────────────
async function callOpenAI(apiKey: string, model: string, baseUrl: string, prompt: string): Promise<string> {
  const url = (baseUrl || 'https://api.openai.com') + '/v1/chat/completions';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2048,
      temperature: 0.3,
    }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err?.error?.message || `OpenAI API error ${res.status}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// ─── Strip markdown code fences from AI response ─────────────────────────────
function cleanJSON(text: string): string {
  return text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { task, context } = body as { task: string; context: Record<string, unknown> };

  // Load AI config
  const db = getDb();
  const cfg = await db.prepare(`SELECT provider, api_key, model, base_url FROM ai_settings WHERE is_active=1 ORDER BY id DESC LIMIT 1`)
    .get() as { provider: string; api_key: string; model: string; base_url: string } | undefined;

  if (!cfg || !cfg.api_key) {
    return NextResponse.json({ error: 'Chưa cấu hình AI API Key. Vào Quản trị → Cấu hình AI để thêm key.' }, { status: 400 });
  }

  const apiKey = decryptSecret(cfg.api_key);
  if (!apiKey) {
    return NextResponse.json({ error: 'API Key không giải mã được. Vui lòng nhập lại trong Quản trị → Cấu hình AI.' }, { status: 400 });
  }

  const prompt = buildPrompt(task, context);

  try {
    let raw = '';
    if (cfg.provider === 'gemini') {
      raw = await callGemini(apiKey, cfg.model, prompt);
    } else if (cfg.provider === 'claude') {
      raw = await callClaude(apiKey, cfg.model, cfg.base_url, prompt);
    } else {
      raw = await callOpenAI(apiKey, cfg.model, cfg.base_url, prompt);
    }

    // Try to parse as JSON if expected
    const jsonTasks = ['step1_steps', 'step1_pain_points', 'step2_questions', 'step3_observations', 'analysis_5w1h', 'backlog_story'];
    if (jsonTasks.includes(task)) {
      try {
        const parsed = JSON.parse(cleanJSON(raw));
        return NextResponse.json({ result: parsed, raw });
      } catch {
        // Return raw text if JSON parse fails
        return NextResponse.json({ result: raw, raw });
      }
    }
    return NextResponse.json({ result: raw, raw });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Lỗi không xác định';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
