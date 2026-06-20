import { useStore } from '@nanostores/react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Codicon } from '@/components/ui/codicon'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/utils'
import { notifyError } from '@/store/notifications'
import {
  $projectDialog,
  addProjectFolder,
  closeProjectDialog,
  createProject,
  pickProjectFolder,
  updateProject
} from '@/store/projects'

// Curated, glanceable appearance options. Colors tint the project's leading
// glyph in the sidebar; icons replace the default folder.
const PALETTE = ['#f59e0b', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6', '#ef4444', '#14b8a6', '#f97316', '#64748b']

const ICONS = [
  'folder-library', 'repo', 'rocket', 'beaker', 'flame', 'device-desktop',
  'device-mobile', 'broadcast', 'book', 'globe', 'terminal', 'dashboard',
  'heart', 'package', 'target', 'star-full'
]

function AppearancePicker({
  color,
  icon,
  onColor,
  onIcon
}: {
  color: null | string
  icon: null | string
  onColor: (next: null | string) => void
  onIcon: (next: null | string) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {PALETTE.map(c => (
          <button
            aria-label={`Color ${c}`}
            className={cn(
              'size-5 rounded-full ring-offset-2 ring-offset-background transition',
              color === c && 'ring-2 ring-foreground'
            )}
            key={c}
            onClick={() => onColor(color === c ? null : c)}
            style={{ backgroundColor: c }}
            type="button"
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1">
        {ICONS.map(name => (
          <button
            aria-label={name}
            className={cn(
              'grid size-7 place-items-center rounded-md text-(--ui-text-tertiary) transition hover:bg-(--ui-control-hover-background)',
              icon === name && 'bg-(--ui-control-active-background) text-foreground'
            )}
            key={name}
            onClick={() => onIcon(icon === name ? null : name)}
            style={icon === name && color ? { color } : undefined}
            type="button"
          >
            <Codicon name={name} size="0.875rem" />
          </button>
        ))}
      </div>
    </div>
  )
}

// Single dialog mounted once in the sidebar; it renders create / rename /
// add-folder flows driven by the $projectDialog atom. Folders are chosen via
// the native directory picker (reused from the default-project-dir setting).
export function ProjectDialog() {
  const { t } = useI18n()
  const p = t.sidebar.projects
  const state = useStore($projectDialog)
  const open = state !== null
  const mode = state?.mode ?? 'create'

  const [name, setName] = useState('')
  const [folders, setFolders] = useState<string[]>([])
  const [color, setColor] = useState<null | string>(null)
  const [icon, setIcon] = useState<null | string>(null)
  const [submitting, setSubmitting] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setName(state?.name ?? '')
      setFolders([])
      setColor(state?.color ?? null)
      setIcon(state?.icon ?? null)
      setSubmitting(false)

      if (mode !== 'add-folder') {
        window.setTimeout(() => nameRef.current?.select(), 0)
      }
    }
  }, [open, mode, state?.name, state?.color, state?.icon])

  const onOpenChange = (next: boolean) => {
    if (!next) {
      closeProjectDialog()
    }
  }

  const pickFolder = async () => {
    const dir = await pickProjectFolder()

    if (!dir) {
      return
    }

    if (mode === 'add-folder' && state?.projectId) {
      setSubmitting(true)

      try {
        await addProjectFolder(state.projectId, dir)
        closeProjectDialog()
      } catch (err) {
        notifyError(err, p.createFailed)
      } finally {
        setSubmitting(false)
      }

      return
    }

    setFolders(prev => (prev.includes(dir) ? prev : [...prev, dir]))
  }

  const submit = async () => {
    if (submitting) {
      return
    }

    const trimmed = name.trim()

    if (mode === 'rename' && state?.projectId) {
      if (!trimmed) {
        return
      }

      setSubmitting(true)

      try {
        await updateProject(state.projectId, { color, icon, name: trimmed })
        closeProjectDialog()
      } catch (err) {
        notifyError(err, p.createFailed)
      } finally {
        setSubmitting(false)
      }

      return
    }

    if (mode === 'create') {
      // A project owns sessions by folder (cwd-prefix), so creation requires at
      // least one — a folder-less project couldn't hold a session anyway.
      if (!trimmed || !folders.length) {
        return
      }

      setSubmitting(true)

      try {
        await createProject({ color: color ?? undefined, folders, icon: icon ?? undefined, name: trimmed, use: true })
        closeProjectDialog()
      } catch (err) {
        notifyError(err, p.createFailed)
      } finally {
        setSubmitting(false)
      }
    }
  }

  const title = mode === 'rename' ? p.renameTitle : mode === 'add-folder' ? p.addFolderTitle : p.createTitle

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {mode === 'create' && <DialogDescription>{p.createDesc}</DialogDescription>}
        </DialogHeader>

        {mode !== 'add-folder' && (
          <Input
            autoFocus
            disabled={submitting}
            onChange={event => setName(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void submit()
              } else if (event.key === 'Escape') {
                onOpenChange(false)
              }
            }}
            placeholder={p.namePlaceholder}
            ref={nameRef}
            value={name}
          />
        )}

        {mode !== 'add-folder' && (
          <AppearancePicker color={color} icon={icon} onColor={setColor} onIcon={setIcon} />
        )}

        {mode === 'create' && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[0.6875rem] font-medium text-(--ui-text-tertiary)">{p.foldersLabel}</span>
            {folders.length === 0 ? (
              <span className="text-[0.75rem] text-(--ui-text-quaternary)">{p.noFolders}</span>
            ) : (
              <ul className="flex flex-col gap-1">
                {folders.map((folder, index) => (
                  <li
                    className={cn(
                      'flex items-center gap-2 rounded-md bg-(--ui-control-hover-background) px-2 py-1 text-[0.75rem]'
                    )}
                    key={folder}
                  >
                    <Codicon className="shrink-0 text-(--ui-text-tertiary)" name="folder" size="0.75rem" />
                    <span className="min-w-0 flex-1 truncate" title={folder}>
                      {folder}
                    </span>
                    {index === 0 && (
                      <span className="shrink-0 text-[0.625rem] uppercase text-(--ui-text-quaternary)">
                        {p.primaryBadge}
                      </span>
                    )}
                    <Button
                      aria-label={p.removeFolder}
                      className="size-5 shrink-0 text-(--ui-text-quaternary) hover:text-foreground"
                      onClick={() => setFolders(prev => prev.filter(f => f !== folder))}
                      size="icon-xs"
                      type="button"
                      variant="ghost"
                    >
                      <Codicon name="close" size="0.75rem" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <Button
              className="self-start"
              disabled={submitting}
              onClick={() => void pickFolder()}
              size="sm"
              type="button"
              variant="ghost"
            >
              <Codicon name="add" size="0.75rem" />
              {p.addFolder}
            </Button>
          </div>
        )}

        {mode === 'add-folder' && (
          <Button disabled={submitting} onClick={() => void pickFolder()} type="button">
            <Codicon name="folder-opened" size="0.875rem" />
            {p.addFolder}
          </Button>
        )}

        {mode !== 'add-folder' && (
          <DialogFooter>
            <Button disabled={submitting} onClick={() => onOpenChange(false)} type="button" variant="ghost">
              {t.common.cancel}
            </Button>
            <Button
              disabled={submitting || !name.trim() || (mode === 'create' && folders.length === 0)}
              onClick={() => void submit()}
              type="button"
            >
              {mode === 'rename' ? t.common.save : p.create}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
