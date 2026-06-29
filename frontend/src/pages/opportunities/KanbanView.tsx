import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useDroppable } from '@dnd-kit/core'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { opportunitiesApi } from '@/api/opportunities'
import { Badge } from '@/components/ui/Badge'
import WinLossModal from '@/components/WinLossModal'
import { fa, enumLabel } from '@/lib/i18n/fa'
import {
  CLOSED_STAGES,
  KANBAN_STAGES,
  probabilityColor,
  userInitials,
  type KanbanBoard,
} from '@/lib/opportunityConstants'
import { formatCurrencyFaShort, toPersianDigits } from '@/lib/utils/persian'
import { toJalali } from '@/lib/utils/jalali'
import type { Opportunity, SalesStage } from '@/types'

function KanbanCard({ opp, isDragging }: { opp: Opportunity; isDragging?: boolean }) {
  const navigate = useNavigate()
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: opp.id, data: { opp } })

  const style = transform
    ? { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.5 : 1 }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="cursor-grab rounded-lg border border-gray-200 bg-white p-3 shadow-sm active:cursor-grabbing"
      onClick={() => navigate(`/opportunities/${opp.id}`)}
    >
      <p className="font-semibold text-gray-900">{opp.title}</p>
      <p className="mt-1 text-xs text-gray-500">{opp.account_name}</p>
      {opp.estimated_value != null && (
        <p className="mt-2 text-sm font-medium text-primary">
          {formatCurrencyFaShort(Number(opp.estimated_value))}
        </p>
      )}
      <div className="mt-2">
        <div className="mb-1 flex justify-between text-xs text-gray-500">
          <span>{toPersianDigits(opp.probability)}٪</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-full ${probabilityColor(opp.probability)}`}
            style={{ width: `${opp.probability}%` }}
          />
        </div>
      </div>
      {opp.expected_close_date && (
        <p className={`mt-2 text-xs ${opp.is_overdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
          {toJalali(opp.expected_close_date)}
          {opp.is_overdue && ' — معوق'}
        </p>
      )}
      <div className="mt-2 flex items-center justify-between">
        {opp.pending_win_loss && (
          <Badge variant="yellow">{fa.opportunities.pendingAnalysis}</Badge>
        )}
        {opp.assigned_to_name && (
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs text-white"
            title={opp.assigned_to_name}
          >
            {userInitials(opp.assigned_to_name)}
          </span>
        )}
      </div>
    </div>
  )
}

function KanbanColumn({
  stage,
  items,
}: {
  stage: string
  items: Opportunity[]
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })
  const isClosed = CLOSED_STAGES.includes(stage as typeof CLOSED_STAGES[number])

  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col rounded-lg border bg-slate-50 ${
        isOver ? 'border-primary ring-2 ring-primary/20' : 'border-gray-200'
      } ${isClosed ? 'bg-slate-100' : ''}`}
    >
      <div className="border-b border-gray-200 px-3 py-2">
        <h3 className="text-sm font-semibold text-gray-800">
          {enumLabel('sales_stage', stage)}
        </h3>
        <span className="text-xs text-gray-500">{toPersianDigits(items.length)} فرصت</span>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2" style={{ minHeight: 200, maxHeight: '70vh' }}>
        {items.length === 0 ? (
          <p className="py-4 text-center text-xs text-gray-400">{fa.empty.opportunities_stage}</p>
        ) : (
          items.map((opp) => <KanbanCard key={opp.id} opp={opp} />)
        )}
      </div>
    </div>
  )
}

interface KanbanViewProps {
  refreshKey?: number
  onRefresh?: () => void
}

export default function KanbanView({ refreshKey = 0, onRefresh }: KanbanViewProps) {
  const [board, setBoard] = useState<KanbanBoard>({})
  const [loading, setLoading] = useState(true)
  const [activeOpp, setActiveOpp] = useState<Opportunity | null>(null)
  const [winLossOpen, setWinLossOpen] = useState(false)
  const [pendingMove, setPendingMove] = useState<{ oppId: string; stage: SalesStage } | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const fetchKanban = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await opportunitiesApi.kanban()
      setBoard(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchKanban()
  }, [fetchKanban, refreshKey])

  const findOpp = (id: string): Opportunity | undefined => {
    for (const stage of KANBAN_STAGES) {
      const found = (board[stage] ?? []).find((o) => o.id === id)
      if (found) return found
    }
    return undefined
  }

  const applyStageUpdate = async (oppId: string, newStage: SalesStage) => {
    const prev = { ...board }
    const opp = findOpp(oppId)
    if (!opp) return

    const optimistic: KanbanBoard = {}
    for (const stage of KANBAN_STAGES) {
      optimistic[stage] = (board[stage] ?? []).filter((o) => o.id !== oppId)
    }
    const updated = { ...opp, sales_stage: newStage }
    optimistic[newStage] = [updated, ...(optimistic[newStage] ?? [])]
    setBoard(optimistic)

    try {
      await opportunitiesApi.update(oppId, { sales_stage: newStage })
      onRefresh?.()
      await fetchKanban()
    } catch {
      setBoard(prev)
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    const opp = findOpp(String(event.active.id))
    setActiveOpp(opp ?? null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveOpp(null)
    const { active, over } = event
    if (!over) return

    const oppId = String(active.id)
    const newStage = String(over.id) as SalesStage
    const opp = findOpp(oppId)
    if (!opp || opp.sales_stage === newStage) return

    if (CLOSED_STAGES.includes(newStage as typeof CLOSED_STAGES[number])) {
      setPendingMove({ oppId, stage: newStage })
      setWinLossOpen(true)
      return
    }

    await applyStageUpdate(oppId, newStage)
  }

  const handleWinLossComplete = async (savedAnalysis: boolean) => {
    if (!pendingMove) return
    await applyStageUpdate(pendingMove.oppId, pendingMove.stage)
    if (savedAnalysis) await fetchKanban()
    setPendingMove(null)
  }

  if (loading) {
    return <div className="py-12 text-center text-gray-500">{fa.actions.loading}</div>
  }

  return (
    <>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex flex-row-reverse gap-3 overflow-x-auto pb-4">
          {KANBAN_STAGES.map((stage) => (
            <KanbanColumn key={stage} stage={stage} items={board[stage] ?? []} />
          ))}
        </div>
        <DragOverlay>
          {activeOpp ? <KanbanCard opp={activeOpp} isDragging /> : null}
        </DragOverlay>
      </DndContext>

      {pendingMove && (
        <WinLossModal
          open={winLossOpen}
          onOpenChange={setWinLossOpen}
          opportunityId={pendingMove.oppId}
          targetStage={pendingMove.stage}
          onComplete={handleWinLossComplete}
        />
      )}
    </>
  )
}
