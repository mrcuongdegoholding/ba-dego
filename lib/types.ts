export type ProjectStatus = 'Khởi tạo' | 'Đang khảo sát' | 'Đang phân tích' | 'Đã chốt yêu cầu' | 'Đang Code';
export type Priority = 'P0-Core' | 'P1-High' | 'P2-NiceToHave';
export type QACategory = 'normal' | 'edge_case' | 'exception' | 'approval_flow';
export type ActionType = 'redundant' | 'hidden' | 'manual' | 'workaround' | 'communication';
export type AutomationPotential = 'high' | 'medium' | 'low';
export type UserRole = 'admin' | 'ba' | 'dev' | 'manager';

export interface User {
  id: number;
  username: string;
  full_name: string;
  role: UserRole;
  is_active: number;
  created_at: string;
}

export interface Project {
  id: number;
  name: string;
  description: string;
  status: ProjectStatus;
  stakeholders: string;
  is_locked: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProcessStep {
  order: number;
  step: string;
  tool: string;
  duration: string;
}

export interface SurveyStep1 {
  id: number;
  project_id: number;
  process_name: string;
  department: string;
  role: string;
  frequency: string;
  current_tools: string;
  process_steps: string;
  input_documents: string;
  output_documents: string;
  pain_points: string;
  notes: string;
  created_by: string;
  created_at: string;
}

export interface SurveyStep2 {
  id: number;
  project_id: number;
  step1_id: number | null;
  question: string;
  answer: string;
  category: QACategory;
  is_pain_point: number;
  follow_up: string;
  created_by: string;
  created_at: string;
}

export interface SurveyStep3 {
  id: number;
  project_id: number;
  step1_id: number | null;
  observation: string;
  action_type: ActionType;
  duration_minutes: number;
  frequency: string;
  automation_potential: AutomationPotential;
  is_pain_point: number;
  hidden_requirement: string;
  created_by: string;
  created_at: string;
}

export interface Analysis5W1H {
  id: number;
  project_id: number;
  business_flow: string;
  what: string;
  who: string;
  where_field: string;
  when_field: string;
  why: string;
  how_edge_cases: string;
  source_step1_ids: string;
  source_step2_ids: string;
  source_step3_ids: string;
  created_at: string;
}

export interface ProductBacklog {
  id: number;
  project_id: number;
  analysis_id: number | null;
  user_story: string;
  acceptance_criteria: string;
  priority: Priority;
  status: string;
  epic_group: string;
  estimated_hours: number;
  is_locked: number;
  is_change_request: number;
  cr_reason: string;
  cr_impact: string;
  cr_manhours: string;
  cr_approved: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  version?: string;
}

export interface EvaluationCheck {
  id: number;
  project_id: number;
  entity_type: string;
  entity_id: number | null;
  criterion_group: string;
  item_key: string;
  checked: number;
  note: string;
  updated_by: string;
  updated_at: string;
}

export interface AuditLog {
  id: number;
  project_id: number;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id: number;
  detail: string;
  created_at: string;
}
