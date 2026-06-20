import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Codicon } from '@/components/ui/codicon'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/utils'
import { dismissAutoProject } from '@/store/layout'
import { copyPath, deleteProject, openProjectAddFolder, openProjectRename, revealPath, setActiveProject } from '@/store/projects'

import type { SidebarProjectTree } from './workspace-groups'

// Per-project actions, modeled on git GUIs (GitHub Desktop / GitKraken): reveal
// in the file manager, copy path, and "Remove from sidebar" (never deletes files
// — auto projects are dismissed, explicit ones drop their entry). Explicit
// projects additionally get rename / add folder / set active. Hidden until the
// row is hovered (group/workspace), matching the + affordance.
export function ProjectMenu({
  project,
  isActive,
  scoped = false,
  onExitScope
}: {
  project: SidebarProjectTree
  isActive: boolean
  // True when rendered in the entered-project header, so removal can leave the
  // now-defunct scope.
  scoped?: boolean
  onExitScope?: () => void
}) {
  const { t } = useI18n()
  const p = t.sidebar.projects
  const target = { id: project.id, name: project.label }
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  const removeAuto = () => {
    dismissAutoProject(project.id)

    if (scoped) {
      onExitScope?.()
    }
  }

  const confirmDelete = () => {
    void deleteProject(project.id)
    setConfirmDeleteOpen(false)

    if (scoped) {
      onExitScope?.()
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-label={p.menu}
            className={cn(
              'grid size-4 shrink-0 place-items-center rounded-sm bg-transparent text-(--ui-text-quaternary) opacity-0 transition-opacity hover:bg-(--ui-control-hover-background) hover:text-foreground data-[state=open]:opacity-100',
              // In the project header reveal on the whole header hover; in overview
              // rows reveal on the row hover.
              scoped ? 'group-hover/section:opacity-100' : 'group-hover/workspace:opacity-100'
            )}
            onClick={event => event.stopPropagation()}
            type="button"
          >
            <Codicon name="kebab-vertical" size="0.75rem" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48" sideOffset={6}>
          {!project.isAuto && (
            <>
              <DropdownMenuItem
                onSelect={() => openProjectRename({ color: project.color, icon: project.icon, id: project.id, name: project.label })}
              >
                <Codicon name="edit" size="0.875rem" />
                <span>{p.menuRename}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => openProjectAddFolder(target)}>
                <Codicon name="new-folder" size="0.875rem" />
                <span>{p.menuAddFolder}</span>
              </DropdownMenuItem>
              <DropdownMenuItem disabled={isActive} onSelect={() => void setActiveProject(project.id)}>
                <Codicon name="target" size="0.875rem" />
                <span>{p.menuSetActive}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem disabled={!project.path} onSelect={() => void revealPath(project.path)}>
            <Codicon name="folder-opened" size="0.875rem" />
            <span>{p.reveal}</span>
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!project.path} onSelect={() => void copyPath(project.path)}>
            <Codicon name="copy" size="0.875rem" />
            <span>{p.copyPath}</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {project.isAuto ? (
            <DropdownMenuItem onSelect={removeAuto} variant="destructive">
              <Codicon name="trash" size="0.875rem" />
              <span>{p.removeFromSidebar}</span>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => setConfirmDeleteOpen(true)} variant="destructive">
              <Codicon name="trash" size="0.875rem" />
              <span>{`${p.menuDelete}…`}</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog onOpenChange={setConfirmDeleteOpen} open={confirmDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{`${p.menuDelete} "${project.label}"?`}</DialogTitle>
            <DialogDescription>
              This removes the saved project from Hermes. Files, git repos, and worktrees stay untouched.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setConfirmDeleteOpen(false)} variant="ghost">
              Cancel
            </Button>
            <Button onClick={confirmDelete} variant="destructive">
              {p.menuDelete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
