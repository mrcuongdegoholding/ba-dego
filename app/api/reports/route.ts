import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = getDb();

  const projects = await db.prepare(`SELECT id, name, status, is_locked, created_at FROM projects ORDER BY created_at DESC`).all() as {
    id: number; name: string; status: string; is_locked: number; created_at: string;
  }[];

  const byStatus = projects.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const surveyStats = await db.prepare(`
    SELECT
      p.id, p.name,
      COUNT(DISTINCT s1.id) as step1_count,
      COUNT(DISTINCT s2.id) as step2_count,
      COUNT(DISTINCT s3.id) as step3_count,
      COUNT(DISTINCT a.id) as analysis_count,
      COUNT(DISTINCT b.id) as backlog_count,
      SUM(CASE WHEN b.priority='P0-Core' THEN 1 ELSE 0 END) as p0_count,
      SUM(CASE WHEN b.priority='P1-High' THEN 1 ELSE 0 END) as p1_count,
      SUM(CASE WHEN b.priority='P2-NiceToHave' THEN 1 ELSE 0 END) as p2_count,
      SUM(CASE WHEN b.is_change_request=1 THEN 1 ELSE 0 END) as cr_count,
      SUM(CASE WHEN b.is_change_request=1 AND b.cr_approved=0 THEN 1 ELSE 0 END) as cr_pending,
      SUM(CASE WHEN b.is_change_request=1 AND b.cr_approved=1 THEN 1 ELSE 0 END) as cr_approved
    FROM projects p
    LEFT JOIN survey_step1 s1 ON s1.project_id = p.id
    LEFT JOIN survey_step2 s2 ON s2.project_id = p.id
    LEFT JOIN survey_step3 s3 ON s3.project_id = p.id
    LEFT JOIN analysis_5w1h a ON a.project_id = p.id
    LEFT JOIN product_backlog b ON b.project_id = p.id
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `).all();

  const evalStats = await db.prepare(`
    SELECT entity_type, COUNT(*) as total, SUM(checked) as checked_count
    FROM evaluation_checks
    GROUP BY entity_type
  `).all();

  const totals = {
    projects: projects.length,
    locked: projects.filter(p => p.is_locked).length,
    surveyEntries: (await db.prepare(`SELECT COUNT(*) as c FROM survey_step1`).get() as { c: number }).c,
    qaEntries: (await db.prepare(`SELECT COUNT(*) as c FROM survey_step2`).get() as { c: number }).c,
    observations: (await db.prepare(`SELECT COUNT(*) as c FROM survey_step3`).get() as { c: number }).c,
    analysisRows: (await db.prepare(`SELECT COUNT(*) as c FROM analysis_5w1h`).get() as { c: number }).c,
    backlogItems: (await db.prepare(`SELECT COUNT(*) as c FROM product_backlog WHERE is_change_request=0`).get() as { c: number }).c,
    crPending: (await db.prepare(`SELECT COUNT(*) as c FROM product_backlog WHERE is_change_request=1 AND cr_approved=0`).get() as { c: number }).c,
    evalChecked: (await db.prepare(`SELECT SUM(checked) as c FROM evaluation_checks`).get() as { c: number }).c || 0,
    evalTotal: (await db.prepare(`SELECT COUNT(*) as c FROM evaluation_checks`).get() as { c: number }).c || 0,
  };

  return NextResponse.json({ byStatus, surveyStats, evalStats, totals });
}
