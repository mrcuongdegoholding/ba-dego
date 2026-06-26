import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getDb } from '@/lib/db';
import { verifySession, SESSION_COOKIE } from '@/lib/jwt';
import { canExportBRD } from '@/lib/permissions';
import PrintButton from '@/components/PrintButton';
import type { Project, SurveyStep1, Analysis5W1H, ProductBacklog } from '@/lib/types';

interface ProcessStep { order: number; step: string; tool?: string; duration?: string }

export default async function PrintPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ autoprint?: string; sections?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  // Server-side auth guard — the print page reads project data directly from DB,
  // so it must verify the session itself (proxy only covers /api/*).
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) redirect('/login');
  if (!canExportBRD(session)) redirect(`/projects/${id}`);

  const autoPrint = sp.autoprint === '1';
  const enabled = (key: string) => !sp.sections || sp.sections.split(',').includes(key);

  const db = getDb();

  const project = await db.prepare('SELECT * FROM projects WHERE id=?').get(parseInt(id)) as Project | undefined;
  if (!project) return <div>Không tìm thấy dự án</div>;

  const step1s = await db.prepare('SELECT * FROM survey_step1 WHERE project_id=? ORDER BY id').all(parseInt(id)) as SurveyStep1[];
  const analyses = await db.prepare('SELECT * FROM analysis_5w1h WHERE project_id=? ORDER BY id').all(parseInt(id)) as Analysis5W1H[];
  const backlog = await db.prepare('SELECT * FROM product_backlog WHERE project_id=? AND is_change_request=0 ORDER BY priority, id').all(parseInt(id)) as ProductBacklog[];

  const now = new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const priorityLabel: Record<string, string> = {
    'P0-Core': 'P0 — Core', 'P1-High': 'P1 — High', 'P2-NiceToHave': 'P2 — Nice to have',
  };

  return (
    <html lang="vi">
      <head>
        <meta charSet="utf-8" />
        <title>BRD — {project.name}</title>
        <style dangerouslySetInnerHTML={{ __html: `
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #1a1a2e; background: white; }
          @page { size: A4; margin: 18mm 16mm 20mm 16mm; }
          @media print {
            .no-print { display: none !important; }
            body { font-size: 10pt; }
            .page-break { page-break-before: always; }
          }

          /* Running header/footer via CSS */
          @page { @top-center { content: "DX-BA Hub — BRD: ${project.name.replace(/"/g, '\\"')}"; font-size: 8pt; color: #888; } }
          @page { @bottom-right { content: "Trang " counter(page) " / " counter(pages); font-size: 8pt; color: #888; } }
          @page { @bottom-left { content: "Ngày in: ${now}"; font-size: 8pt; color: #888; } }

          .cover { text-align: center; padding: 60px 20px; border-bottom: 3px solid #1e40af; margin-bottom: 32px; }
          .cover h1 { font-size: 22pt; font-weight: 800; color: #1e3a8a; margin-bottom: 6px; }
          .cover h2 { font-size: 14pt; color: #3b82f6; font-weight: 600; margin-bottom: 20px; }
          .cover .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; text-align: left; max-width: 480px; margin: 0 auto; font-size: 10pt; }
          .cover .meta-row { display: flex; gap: 8px; background: #f0f4ff; border-radius: 6px; padding: 6px 10px; }
          .cover .meta-label { color: #6b7280; font-size: 9pt; min-width: 100px; }
          .cover .meta-value { font-weight: 600; color: #1e3a8a; }

          .section-title { font-size: 13pt; font-weight: 800; color: #1e3a8a; border-left: 4px solid #3b82f6; padding-left: 10px; margin: 24px 0 14px 0; }
          .sub-title { font-size: 11pt; font-weight: 700; color: #374151; margin: 16px 0 8px 0; }

          table { width: 100%; border-collapse: collapse; font-size: 9.5pt; margin-bottom: 12px; }
          th { background: #1e3a8a; color: white; padding: 7px 10px; text-align: left; font-weight: 700; }
          td { padding: 6px 10px; vertical-align: top; border-bottom: 1px solid #e5e7eb; }
          tr:nth-child(even) td { background: #f8fafc; }

          .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 8.5pt; font-weight: 700; }
          .badge-p0 { background: #fee2e2; color: #991b1b; }
          .badge-p1 { background: #ffedd5; color: #9a3412; }
          .badge-p2 { background: #f3f4f6; color: #374151; }
          .badge-status { background: #dbeafe; color: #1e40af; }

          .ac-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 4px; padding: 6px 8px; font-family: monospace; font-size: 9pt; white-space: pre-wrap; margin-top: 4px; }
          .pain-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 4px; padding: 4px 8px; font-size: 9pt; }
          .w5h1-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; }
          .w5h1-cell { background: #f0f4ff; border-radius: 6px; padding: 8px 10px; }
          .w5h1-label { font-size: 8.5pt; font-weight: 800; color: #3b82f6; text-transform: uppercase; margin-bottom: 3px; }
          .w5h1-value { font-size: 9.5pt; color: #1a1a2e; line-height: 1.4; }
          .w5h1-how { background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 8px 10px; margin-top: 4px; }
          .signature-block { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 30px; }
          .sig-box { text-align: center; }
          .sig-role { font-weight: 700; font-size: 10pt; margin-bottom: 4px; color: #374151; }
          .sig-name { color: #6b7280; font-size: 9pt; margin-bottom: 50px; }
          .sig-line { border-top: 1px solid #9ca3af; padding-top: 4px; font-size: 9pt; color: #6b7280; }
          .print-btn { position: fixed; bottom: 24px; right: 24px; background: #2563eb; color: white; border: none; padding: 12px 24px; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(37,99,235,0.4); z-index: 100; }
          .print-btn:hover { background: #1d4ed8; }
        ` }} />
      </head>
      <body>
        <PrintButton autoPrint={autoPrint} />

        {/* DRAFT watermark when project is not yet frozen */}
        {project.is_locked !== 1 && (
          <div style={{
            position: 'fixed', top: '45%', left: '50%', transform: 'translate(-50%,-50%) rotate(-30deg)',
            fontSize: '72pt', fontWeight: 900, color: 'rgba(220,38,38,0.10)', zIndex: 0,
            pointerEvents: 'none', whiteSpace: 'nowrap', letterSpacing: '8px',
          }}>
            DRAFT — CHƯA CHỐT
          </div>
        )}

        {/* Cover */}
        <div className="cover">
          <h1>DX-BA HUB</h1>
          <h2>Business Requirements Document (BRD)</h2>
          <h2 style={{ fontSize: '16pt', color: '#1e3a8a', fontWeight: 800, marginBottom: 24 }}>{project.name}</h2>
          <div className="meta">
            <div className="meta-row"><span className="meta-label">Trạng thái</span><span className="meta-value badge badge-status">{project.status}</span></div>
            <div className="meta-row"><span className="meta-label">Ngày tạo</span><span className="meta-value">{project.created_at?.slice(0, 10)}</span></div>
            <div className="meta-row"><span className="meta-label">Tạo bởi</span><span className="meta-value">{project.created_by || 'BA Team'}</span></div>
            <div className="meta-row"><span className="meta-label">Ngày in</span><span className="meta-value">{now}</span></div>
          </div>
          {project.description && (
            <p style={{ marginTop: 16, color: '#4b5563', maxWidth: 560, margin: '20px auto 0', lineHeight: 1.6 }}>{project.description}</p>
          )}
        </div>

        {/* Section 1: As-Is Process */}
        {enabled('asis') && (
        <>
        <div className="section-title">1. QUY TRÌNH AS-IS (Bước 1 — Khảo sát)</div>
        {step1s.length === 0 ? (
          <p style={{ color: '#9ca3af', fontStyle: 'italic' }}>Chưa có dữ liệu khảo sát</p>
        ) : step1s.map((s, idx) => {
          const steps = JSON.parse(s.process_steps || '[]') as ProcessStep[];
          const pains = JSON.parse(s.pain_points || '[]') as string[];
          const tools = JSON.parse(s.current_tools || '[]') as string[];
          return (
            <div key={s.id} style={{ marginBottom: 20 }}>
              <div className="sub-title">{idx + 1}. {s.process_name}</div>
              <table>
                <tbody>
                  <tr><td style={{ width: '30%', color: '#6b7280' }}>Phòng ban</td><td>{s.department}</td><td style={{ width: '20%', color: '#6b7280' }}>Vai trò</td><td>{s.role}</td></tr>
                  <tr><td style={{ color: '#6b7280' }}>Tần suất</td><td>{s.frequency || '—'}</td><td style={{ color: '#6b7280' }}>Công cụ</td><td>{tools.join(', ') || '—'}</td></tr>
                </tbody>
              </table>
              {steps.length > 0 && (
                <table>
                  <thead><tr><th style={{ width: 30 }}>#</th><th>Bước thực hiện</th><th style={{ width: '20%' }}>Công cụ</th><th style={{ width: '15%' }}>Thời gian</th></tr></thead>
                  <tbody>
                    {steps.map((st, i) => (
                      <tr key={i}><td>{st.order}</td><td>{st.step}</td><td>{st.tool || '—'}</td><td>{st.duration || '—'}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
              {pains.length > 0 && (
                <div>
                  <div style={{ fontSize: '9.5pt', fontWeight: 700, color: '#991b1b', marginBottom: 4 }}>Pain Points:</div>
                  {pains.map((p, i) => <div key={i} className="pain-box" style={{ marginBottom: 4 }}>• {p}</div>)}
                </div>
              )}
            </div>
          );
        })}
        </>
        )}

        {/* Section 2: 5W1H Analysis */}
        {enabled('analysis') && analyses.length > 0 && (
          <>
            <div className="section-title page-break">2. PHÂN TÍCH 5W1H</div>
            {analyses.map((a, idx) => (
              <div key={a.id} style={{ marginBottom: 20 }}>
                <div className="sub-title">{idx + 1}. {a.business_flow}</div>
                <div className="w5h1-grid">
                  {a.what && <div className="w5h1-cell"><div className="w5h1-label">What ❓</div><div className="w5h1-value">{a.what}</div></div>}
                  {a.who && <div className="w5h1-cell"><div className="w5h1-label">Who 👤</div><div className="w5h1-value">{a.who}</div></div>}
                  {a.where_field && <div className="w5h1-cell"><div className="w5h1-label">Where 📍</div><div className="w5h1-value">{a.where_field}</div></div>}
                  {a.when_field && <div className="w5h1-cell"><div className="w5h1-label">When ⏰</div><div className="w5h1-value">{a.when_field}</div></div>}
                  {a.why && <div className="w5h1-cell" style={{ gridColumn: 'span 2' }}><div className="w5h1-label">Why 💡</div><div className="w5h1-value">{a.why}</div></div>}
                </div>
                {a.how_edge_cases && (
                  <div className="w5h1-how"><div className="w5h1-label" style={{ color: '#d97706' }}>How / Edge Cases ⚠️</div><div className="w5h1-value" style={{ marginTop: 4 }}>{a.how_edge_cases}</div></div>
                )}
              </div>
            ))}
          </>
        )}

        {/* Section 3: Product Backlog */}
        {enabled('backlog') && backlog.length > 0 && (
          <>
            <div className="section-title page-break">3. PRODUCT BACKLOG</div>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 30 }}>#</th>
                  <th>User Story</th>
                  <th style={{ width: '18%' }}>Priority</th>
                  <th style={{ width: '8%' }}>Ver</th>
                </tr>
              </thead>
              <tbody>
                {backlog.map((task, i) => {
                  const pKey = task.priority as keyof typeof priorityLabel;
                  const badgeClass = task.priority === 'P0-Core' ? 'badge-p0' : task.priority === 'P1-High' ? 'badge-p1' : 'badge-p2';
                  return (
                    <>
                      <tr key={task.id}>
                        <td>{i + 1}</td>
                        <td style={{ fontStyle: 'italic' }}>{task.user_story}</td>
                        <td><span className={`badge ${badgeClass}`}>{priorityLabel[pKey] || task.priority}</span></td>
                        <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#92400e' }}>{(task as ProductBacklog & { version?: string }).version || 'v1.0'}</td>
                      </tr>
                      {task.acceptance_criteria && (
                        <tr key={`${task.id}-ac`}>
                          <td></td>
                          <td colSpan={3}>
                            <div className="ac-box">{task.acceptance_criteria}</div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </>
        )}

        {/* Signature block */}
        {enabled('signature') && (
        <div className="signature-block" style={{ marginTop: 48 }}>
          {[
            { role: 'Người lập tài liệu (BA)', name: 'Giang' },
            { role: 'Quản lý dự án (PM)', name: '' },
            { role: 'Người phê duyệt (CEO/CTO)', name: 'Trần Chí Dững' },
          ].map(sig => (
            <div key={sig.role} className="sig-box">
              <div className="sig-role">{sig.role}</div>
              <div className="sig-name">{sig.name}</div>
              <div className="sig-line">Ký tên & Đóng dấu</div>
            </div>
          ))}
        </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 24, paddingTop: 12, borderTop: '1px solid #e5e7eb', fontSize: '8.5pt', color: '#9ca3af' }}>
          Tài liệu được tạo tự động từ DX-BA Hub — {now}
        </div>
      </body>
    </html>
  );
}
