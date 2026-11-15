import { useState } from 'react'
import { haptic } from '../design/haptics'
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Clock3, GripVertical, ListChecks } from 'lucide-react'
import { boardColumns, COLUMNS, DONE_ON_BOARD, planMove } from '../lib/board'
import { formatMinutes } from '../lib/profile'
import { dueLabel, isOverdue, STATUS_LABEL, subtaskProgress, type Status, type Task } from '../lib/tasks'
import styles from './Board.module.css'

type Props = {
  tasks: Task[]
  now: Date
  today: string
  focused: Map<string, number>
  onOpen: (task: Task) => void
  onMove: (task: Task, status: Status, order: number) => void
}

type CardProps = Omit<Props, 'tasks' | 'onMove'> & { task: Task; onMoveTo: (status: Status) => void }

function CardBody({ task, now, today, focused }: Pick<CardProps, 'task' | 'now' | 'today' | 'focused'>) {
  const steps = subtaskProgress(task)
  const minutes = focused.get(task.id) ?? 0
  const due = dueLabel(task, today)
  return (
    <>
      <span className={styles.title}>{task.title}</span>
      <span className={styles.meta}>
        <span className={`${styles.priority} ${styles[task.priority]}`}>{task.priority}</span>
        {due && <span className={isOverdue(task, now) ? styles.late : ''}>{due}</span>}
        {steps.total > 0 && (
          <span className={styles.metaIcon}>
            <ListChecks size={12} aria-hidden="true" />
            <span className="num">
              {steps.done}/{steps.total}
            </span>
          </span>
        )}
        {(minutes > 0 || task.estimateMinutes > 0) && (
          <span className={styles.metaIcon}>
            <Clock3 size={12} aria-hidden="true" />
            <span className="num">
              {minutes > 0 && formatMinutes(minutes)}
              {minutes > 0 && task.estimateMinutes > 0 && ' / '}
              {task.estimateMinutes > 0 && formatMinutes(task.estimateMinutes)}
            </span>
          </span>
        )}
      </span>
    </>
  )
}

function Card({ task, now, today, focused, onOpen, onMoveTo }: CardProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  })
  return (
    <li
      ref={setNodeRef}
      className={`${styles.card} ${isDragging ? styles.placeholder : ''}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        className={styles.grip}
        aria-label={`Move ${task.title}. Press space, then arrow keys.`}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} aria-hidden="true" />
      </button>
      <button type="button" className={styles.body} onClick={() => onOpen(task)}>
        <CardBody task={task} now={now} today={today} focused={focused} />
      </button>
      <select
        className={styles.moveTo}
        aria-label={`Move ${task.title} to`}
        value={task.status}
        onChange={(e) => onMoveTo(e.target.value as Status)}
      >
        {COLUMNS.map((c) => (
          <option key={c} value={c}>
            {STATUS_LABEL[c]}
          </option>
        ))}
      </select>
    </li>
  )
}

function Column({ status, count, children }: { status: Status; count: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${status}` })
  return (
    <section className={`${styles.column} ${isOver ? styles.over : ''}`} aria-label={STATUS_LABEL[status]}>
      <h2 className={styles.columnTitle}>
        {STATUS_LABEL[status]} <span className="num">{count}</span>
      </h2>
      <ul ref={setNodeRef} className={styles.cards}>
        {children}
      </ul>
    </section>
  )
}

/**
 * To do, In progress and Done. Drag by the handle (long-press on phones, space and arrows on
 * a keyboard), or use each card's "Move to" menu. Moves into or out of Done complete or
 * reopen the task, so repeating tasks behave as everywhere else.
 */
export function TaskBoard({ tasks, now, today, focused, onOpen, onMove }: Props) {
  const board = boardColumns(tasks)
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const all = COLUMNS.flatMap((c) => board[c])
  const find = (id: string) => all.find((t) => t.id === id)
  const active = activeId ? find(activeId) : undefined
  const doneTotal = tasks.filter((t) => t.status === 'done').length

  const titleOf = (id: string | number) => find(String(id))?.title ?? 'Task'
  const placeOf = (id: string | number | undefined, self?: string | number) => {
    if (id === undefined) return 'nowhere'
    const column = columnOf(String(id))
    if (!column) return 'nowhere'
    if (String(id).startsWith('col:') || id === self) return STATUS_LABEL[column]
    return `${titleOf(id)} in ${STATUS_LABEL[column]}`
  }
  // Screen readers hear task names and columns, not the drag library's internal IDs.
  const announcements = {
    onDragStart: ({ active: a }: { active: { id: string | number } }) => `Picked up ${titleOf(a.id)}.`,
    onDragOver: ({ active: a, over }: { active: { id: string | number }; over: { id: string | number } | null }) =>
      over ? `${titleOf(a.id)} is over ${placeOf(over.id, a.id)}.` : `${titleOf(a.id)} is not over a column.`,
    onDragEnd: ({ active: a, over }: { active: { id: string | number }; over: { id: string | number } | null }) =>
      over ? `${titleOf(a.id)} moved in ${placeOf(over.id, over.id)}.` : `${titleOf(a.id)} was dropped back.`,
    onDragCancel: ({ active: a }: { active: { id: string | number } }) => `Moving ${titleOf(a.id)} was cancelled.`,
  }

  function columnOf(id: string): Status | undefined {
    if (id.startsWith('col:')) return id.slice(4) as Status
    return COLUMNS.find((c) => board[c].some((t) => t.id === id))
  }

  function onDragEnd({ active: dragged, over }: DragEndEvent) {
    setActiveId(null)
    const task = find(String(dragged.id))
    if (!task || !over) return
    const overId = String(over.id)
    const to = columnOf(overId)
    if (!to) return
    const list = board[to]
    const overIndex = overId.startsWith('col:') ? list.length : list.findIndex((t) => t.id === overId)
    if (to === task.status && (to === 'done' || list[overIndex]?.id === task.id)) return
    const plan = planMove(board, task.id, to, overIndex)
    onMove(task, plan.status, plan.order)
  }

  function moveTo(task: Task, to: Status) {
    if (to === task.status) return
    // The menu puts the card at the top of the new column.
    const plan = planMove(board, task.id, to, 0)
    onMove(task, plan.status, plan.order)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable: 'To move a task, press space, use the arrow keys to choose a spot, then press space again. Escape cancels.',
        },
      }}
      onDragStart={({ active: a }) => {
        haptic('tap')
        setActiveId(String(a.id))
      }}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={onDragEnd}
    >
      <div className={styles.board}>
        {COLUMNS.map((status) => (
          <Column key={status} status={status} count={status === 'done' ? doneTotal : board[status].length}>
            <SortableContext items={board[status].map((t) => t.id)} strategy={verticalListSortingStrategy}>
              {board[status].map((t) => (
                <Card
                  key={t.id}
                  task={t}
                  now={now}
                  today={today}
                  focused={focused}
                  onOpen={onOpen}
                  onMoveTo={(to) => moveTo(t, to)}
                />
              ))}
            </SortableContext>
            {!board[status].length && <li className={styles.emptyColumn}>Drop tasks here</li>}
            {status === 'done' && doneTotal > DONE_ON_BOARD && (
              <li className={styles.emptyColumn}>Showing the latest {DONE_ON_BOARD}</li>
            )}
          </Column>
        ))}
      </div>
      <DragOverlay>
        {active && (
          <div className={`${styles.card} ${styles.lifted}`}>
            <span className={styles.grip} aria-hidden="true">
              <GripVertical size={16} />
            </span>
            <div className={styles.body}>
              <CardBody task={active} now={now} today={today} focused={focused} />
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
