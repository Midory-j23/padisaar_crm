import type { Opportunity } from '@/types'

export const KANBAN_STAGES = [
  'INITIAL_CONTACT',
  'NEEDS_ASSESSMENT',
  'PROPOSAL_SENT',
  'NEGOTIATION',
  'CONTRACT_SIGNED',
  'CLOSED_WON',
  'CLOSED_LOST',
] as const

export type SalesStage = (typeof KANBAN_STAGES)[number] | 'ABANDONED'

export const CLOSED_STAGES = ['CLOSED_WON', 'CLOSED_LOST', 'ABANDONED'] as const

export const STAGE_TO_FINAL_STATUS: Record<string, string> = {
  CLOSED_WON: 'WON',
  CLOSED_LOST: 'LOST',
  ABANDONED: 'ABANDONED',
}

export type KanbanBoard = Record<string, Opportunity[]>

export function probabilityColor(p: number): string {
  if (p > 60) return 'bg-green-500'
  if (p >= 30) return 'bg-yellow-500'
  return 'bg-red-500'
}

export function userInitials(name?: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return parts[0][0] + parts[1][0]
  return name.slice(0, 2)
}
