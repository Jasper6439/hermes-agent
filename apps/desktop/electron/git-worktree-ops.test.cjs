'use strict'

const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const test = require('node:test')

const { ensureGitRepo, parseWorktrees, sanitizeBranch } = require('./git-worktree-ops.cjs')

test('sanitizeBranch: spaces → hyphens, forbidden chars dropped, edges trimmed', () => {
  assert.equal(sanitizeBranch('beach vibes'), 'beach-vibes')
  assert.equal(sanitizeBranch('feat/cool thing'), 'feat/cool-thing')
  assert.equal(sanitizeBranch('  wip~^:? '), 'wip')
  assert.equal(sanitizeBranch('///'), '')
})

test('parseWorktrees: main checkout + linked worktree', () => {
  const out = [
    'worktree /repo',
    'HEAD abc123',
    'branch refs/heads/main',
    '',
    'worktree /repo/.worktrees/feat',
    'HEAD def456',
    'branch refs/heads/hermes/feat',
    ''
  ].join('\n')

  const trees = parseWorktrees(out)

  assert.equal(trees.length, 2)
  assert.equal(trees[0].path, '/repo')
  assert.equal(trees[0].branch, 'main')
  assert.equal(trees[1].path, '/repo/.worktrees/feat')
  assert.equal(trees[1].branch, 'hermes/feat')
})

test('parseWorktrees: detached + locked flags', () => {
  const out = ['worktree /repo/wt', 'HEAD abc', 'detached', 'locked reason', ''].join('\n')
  const trees = parseWorktrees(out)

  assert.equal(trees.length, 1)
  assert.equal(trees[0].detached, true)
  assert.equal(trees[0].locked, true)
  assert.equal(trees[0].branch, null)
})

test('parseWorktrees: empty input', () => {
  assert.deepEqual(parseWorktrees(''), [])
})

test('ensureGitRepo: inits a plain dir with a root commit so worktrees branch', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-wt-'))
  const git = (...args) => execFileSync('git', args, { cwd: dir }).toString().trim()

  try {
    await ensureGitRepo('git', dir)
    assert.match(git('rev-parse', '--verify', 'HEAD'), /^[0-9a-f]{7,}$/)

    // The whole point: a worktree can now branch off the seeded root commit.
    execFileSync('git', ['worktree', 'add', '-b', 'wt', path.join(dir, '.worktrees', 'wt')], { cwd: dir })
    assert.ok(fs.existsSync(path.join(dir, '.worktrees', 'wt')))

    // Idempotent: an already-committed repo gets no extra commit.
    await ensureGitRepo('git', dir)
    assert.equal(git('rev-list', '--count', 'HEAD'), '1')
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
