import type * as React from 'react'

import { Codicon } from '@/components/ui/codicon'
import type { SessionInfo } from '@/hermes'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/utils'

import { latestProjectSessions, PROJECT_PREVIEW_COUNT, SIDEBAR_STACK } from './model'
import { ProjectMenu } from './project-menu'
import type { SidebarProjectTree } from './workspace-groups'
import { WorkspaceAddButton } from './workspace-header'

// Leading glyph shared by the overview row + scope banner: a chosen codicon
// (tinted by the project color), else a color dot, else the default folder.
export function projectIcon(project: SidebarProjectTree) {
  if (project.icon) {
    return (
      <span className="grid shrink-0 place-items-center" style={project.color ? { color: project.color } : undefined}>
        <Codicon className={project.color ? undefined : 'text-(--ui-text-tertiary)'} name={project.icon} size="0.8125rem" />
      </span>
    )
  }

  if (project.color) {
    return <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ backgroundColor: project.color }} />
  }

  return <Codicon className="shrink-0 text-(--ui-text-tertiary)" name="folder-library" size="0.75rem" />
}

interface ProjectOverviewRowProps {
  project: SidebarProjectTree
  onEnter?: (id: string) => void
  onNewSession?: (path: null | string) => void
  renderRows?: (sessions: SessionInfo[]) => React.ReactNode
  activeProjectId?: null | string
  // Recents fetched by cwd-prefix for this project (self-managed), used when the
  // loaded recents page doesn't already contain the project's sessions.
  previewSessions?: SessionInfo[]
}

// One row in the project overview: icon + name (click to enter), a new-session +
// (reveal on hover), and the manage menu (⋮). Below it, a preview of the
// project's most recent sessions — clickable to resume without entering.
export function ProjectOverviewRow({
  project,
  onEnter,
  onNewSession,
  renderRows,
  activeProjectId,
  previewSessions
}: ProjectOverviewRowProps) {
  const { t } = useI18n()
  const s = t.sidebar
  const isActive = project.id === activeProjectId
  // Prefer the project's own cwd-prefix fetch (authoritative recents, including
  // sessions off the loaded page); fall back to whatever's already loaded.
  const fetched = (previewSessions ?? []).slice(0, PROJECT_PREVIEW_COUNT)
  const preview = renderRows ? (fetched.length ? fetched : latestProjectSessions(project, PROJECT_PREVIEW_COUNT)) : []

  return (
    <div>
      <div className="group/workspace flex min-h-7 items-center gap-1 rounded-md pl-2 pr-1 hover:bg-(--ui-control-hover-background)">
        <button
          aria-label={s.projects.enter(project.label)}
          className="flex min-w-0 flex-1 items-center gap-1.5 bg-transparent py-1 text-left"
          onClick={() => onEnter?.(project.id)}
          type="button"
        >
          {projectIcon(project)}
          <span
            className={cn(
              'min-w-0 flex-1 truncate text-[0.8125rem] text-(--ui-text-secondary)',
              isActive && 'font-medium text-foreground'
            )}
          >
            {project.label}
          </span>
        </button>
        {onNewSession && <WorkspaceAddButton label={s.newSessionIn(project.label)} onClick={() => onNewSession(project.path)} />}
        <ProjectMenu isActive={isActive} project={project} />
      </div>
      {preview.length > 0 && <div className={cn(SIDEBAR_STACK, 'pb-1 pl-4')}>{renderRows?.(preview)}</div>}
    </div>
  )
}
