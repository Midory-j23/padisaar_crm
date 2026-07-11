export type UserRole = 'MANAGER' | 'EXPERT'

export interface User {
  id: string
  name: string
  email: string
  mobile?: string | null
  role: UserRole
  notification_prefs?: NotificationPrefs
}

export interface NotificationPrefs {
  OVERDUE_FOLLOWUP: boolean
  UPCOMING_FOLLOWUP: boolean
  AT_RISK_OPPORTUNITY: boolean
  PENDING_WIN_LOSS: boolean
  STAGE_CHANGE: boolean
  NEW_ASSIGNMENT: boolean
}

export type Industry =
  | 'OIL_GAS'
  | 'PETROCHEMICAL'
  | 'STEEL'
  | 'MINING'
  | 'INFRASTRUCTURE'
  | 'OTHER'

export type OrgSize = 'SMALL' | 'MEDIUM' | 'LARGE'

export type PriorityLevel = 'A_STRATEGIC' | 'B_MEDIUM' | 'C_GENERAL'

export type RelationshipStatus =
  | 'CURRENT_CLIENT'
  | 'FORMER_CLIENT'
  | 'NEW_LEAD'
  | 'COMPETITOR'

export interface Account {
  id: string
  name: string
  national_id?: string | null
  industry?: Industry | null
  size?: OrgSize | null
  priority_level?: PriorityLevel | null
  location?: string | null
  website?: string | null
  relationship_status?: RelationshipStatus | null
  account_manager_id?: string | null
  account_manager_name?: string | null
  created_at: string
}

export interface AccountListResponse {
  items: Account[]
  total: number
  page: number
  per_page: number
}

export interface AuditLogEntry {
  id: string
  entity_type: string
  entity_id: string
  entity_summary?: string | null
  action: string
  changed_by_id?: string
  changed_by_name?: string | null
  change_data: Record<string, unknown>
  created_at: string
}

export interface UserOption {
  id: string
  name: string
  email: string
  role: UserRole
}

export type InfluenceLevel =
  | 'DECISION_MAKER'
  | 'TECHNICAL_INFLUENCER'
  | 'BLOCKER'
  | 'BUYER'

export type Sentiment = 'CHAMPION' | 'NEUTRAL' | 'OPPONENT'

export interface Contact {
  id: string
  account_id: string
  account_name?: string | null
  full_name: string
  job_title?: string | null
  department?: string | null
  mobile: string
  direct_line?: string | null
  email?: string | null
  influence_level?: InfluenceLevel | null
  sentiment?: Sentiment | null
  created_at: string
}

export interface ContactListResponse {
  items: Contact[]
  total: number
  page: number
  per_page: number
}

export type ProjectType = 'EPC' | 'EQUIPMENT_SUPPLY' | 'CONSULTING' | 'SUPPORT'
export type SalesStage =
  | 'INITIAL_CONTACT'
  | 'NEEDS_ASSESSMENT'
  | 'PROPOSAL_SENT'
  | 'NEGOTIATION'
  | 'CONTRACT_SIGNED'
  | 'CLOSED_WON'
  | 'CLOSED_LOST'
  | 'ABANDONED'
export type LeadSource = 'TENDER' | 'COLD_CALL' | 'REFERRAL' | 'CONFERENCE' | 'WEBSITE'
export type FinalStatus = 'WON' | 'LOST' | 'ABANDONED'
export type ResultReason = 'PRICE' | 'TECHNOLOGY' | 'RELATIONSHIPS' | 'TIMING' | 'NO_GO' | 'OTHER'

export interface Opportunity {
  id: string
  account_id: string
  account_name?: string | null
  title: string
  project_type?: ProjectType | null
  sales_stage: SalesStage
  estimated_value?: number | null
  probability: number
  lead_source?: LeadSource | null
  expected_close_date?: string | null
  competitors: string[]
  assigned_to_id?: string | null
  assigned_to_name?: string | null
  is_overdue: boolean
  has_win_loss: boolean
  pending_win_loss: boolean
  created_at: string
}

export interface StageHistoryEntry {
  id: string
  from_stage?: SalesStage | null
  to_stage: SalesStage
  changed_by_name?: string | null
  changed_at: string
}

export interface OpportunityDetail extends Opportunity {
  stage_history: StageHistoryEntry[]
}

export interface OpportunityListResponse {
  items: Opportunity[]
  total: number
  page: number
  per_page: number
}

export interface WinLossRecord {
  id: string
  opportunity_id: string
  opportunity_title?: string | null
  account_name?: string | null
  final_status: FinalStatus
  result_reason?: ResultReason | null
  lessons_learned?: string | null
  final_contract_value?: number | null
  analyzed_at: string
  analyzed_by_name?: string | null
}

export interface WinLossListResponse {
  items: WinLossRecord[]
  total: number
  page: number
  per_page: number
}

export interface WinLossSummary {
  total_closed: number
  total_won: number
  total_lost: number
  win_rate: number
  avg_cycle_days?: number | null
  total_won_value?: number | null
  top_loss_reason?: string | null
}

export interface LessonCard {
  id: string
  opportunity_title?: string | null
  account_name?: string | null
  final_status: FinalStatus
  lessons_learned: string
  analyzed_at: string
  analyzed_by_name?: string | null
}

export interface LessonsResponse {
  items: LessonCard[]
  total: number
}

export type ActivityType =
  | 'IN_PERSON_MEETING'
  | 'PHONE_CALL'
  | 'SITE_VISIT'
  | 'PROPOSAL_SENT'
  | 'EMAIL'

export interface Activity {
  id: string
  account_id: string
  account_name?: string | null
  opportunity_id?: string | null
  opportunity_title?: string | null
  contact_id?: string | null
  contact_name?: string | null
  contact_ids?: string[]
  contact_names?: string[]
  activity_type: ActivityType
  activity_date: string
  meeting_notes?: string | null
  outcome?: string | null
  next_step?: string | null
  follow_up_date?: string | null
  follow_up_completed: boolean
  attachment_url?: string | null
  created_by_id: string
  created_by_name?: string | null
  is_follow_up_overdue: boolean
  created_at: string
}

export interface ActivityListResponse {
  items: Activity[]
  total: number
  page: number
  per_page: number
}

export interface OverdueActivitiesResponse {
  count: number
  items: Activity[]
}

export interface DashboardKpis {
  weighted_pipeline_value: number
  conversion_rate: number
  at_risk_count: number
  overdue_followups: number
  period: string
}

export interface FunnelStage {
  stage: string
  count: number
  total_value: number
}

export interface FunnelResponse {
  stages: FunnelStage[]
}

export interface TeamMemberPerformance {
  user_id: string
  user_name: string
  open_count: number
  pipeline_value: number
  win_rate: number
  last_activity_date?: string | null
}

export interface TeamPerformanceResponse {
  members: TeamMemberPerformance[]
}

export interface MonthlyTrendPoint {
  month: string
  won_count: number
  won_value: number
}

export interface LossReasonPoint {
  reason: string
  count: number
}

export interface TrendsResponse {
  monthly_won: MonthlyTrendPoint[]
  loss_reasons: LossReasonPoint[]
}

export interface ExpertOpenOpportunity {
  id: string
  title: string
  account_name?: string | null
  sales_stage: string
  estimated_value?: number | null
  expected_close_date?: string | null
  is_overdue: boolean
}

export interface ExpertSummary {
  weighted_pipeline_value: number
  open_opportunities_count: number
  conversion_rate: number
  overdue_followups: number
  open_opportunities: ExpertOpenOpportunity[]
  overdue_activities: Activity[]
  upcoming_activities: Activity[]
}

export type NotificationType =
  | 'OVERDUE_FOLLOWUP'
  | 'UPCOMING_FOLLOWUP'
  | 'AT_RISK_OPPORTUNITY'
  | 'PENDING_WIN_LOSS'
  | 'STAGE_CHANGE'
  | 'NEW_ASSIGNMENT'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  entity_type?: string | null
  entity_id?: string | null
  is_read: boolean
  created_at: string
}

export interface NotificationListResponse {
  items: Notification[]
  total: number
  page: number
  per_page: number
}

export interface UnreadCountResponse {
  count: number
}

export interface AuditLogEntry {
  id: string
  entity_type: string
  entity_id: string
  entity_summary?: string | null
  action: string
  changed_by_id?: string
  changed_by_name?: string | null
  change_data: Record<string, unknown>
  created_at: string
}

export interface AuditLogListResponse {
  items: AuditLogEntry[]
  total: number
  page: number
  per_page: number
}

export interface ImportRowPreview {
  row_number: number
  record: Record<string, unknown>
  errors: string[]
  valid: boolean
}

export interface ImportPreviewResponse {
  rows: ImportRowPreview[]
  valid_count: number
  error_count: number
}
