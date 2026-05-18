#!/usr/bin/env tsx
/**
 * new-block: emit a new BlockSpec entry into src/data/chip-spec.ts.
 *
 * Usage:
 *   tsx scripts/new-block.ts \
 *     --id compute.p-core-9 \
 *     --label "P-core 9" \
 *     --parent compute \
 *     --w 1.5 --d 1.5 --h 0.4 \
 *     [--instanceOf decode.lane --count 8] \
 *     [--color "#0a1628"]
 *
 * Inserts as the last child of the named parent block.
 * Run from frontend repo root (where src/data/chip-spec.ts lives).
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Args {
  id: string
  label: string
  parent: string
  w: number
  d: number
  h: number
  instanceOf?: string
  count?: number
  color?: string
}

function parseArgs(): Args {
  const argv = process.argv.slice(2)
  const out: Record<string, string> = {}
  for (let i = 0; i < argv.length; i += 2) {
    if (!argv[i].startsWith('--')) {
      console.error(`Unexpected token: ${argv[i]}`)
      process.exit(1)
    }
    out[argv[i].slice(2)] = argv[i + 1]
  }
  if (!out.id || !out.label || !out.parent || !out.w || !out.d || !out.h) {
    console.error('Required: --id --label --parent --w --d --h')
    console.error('Optional: --instanceOf --count --color')
    process.exit(1)
  }
  return {
    id: out.id,
    label: out.label,
    parent: out.parent,
    w: parseFloat(out.w),
    d: parseFloat(out.d),
    h: parseFloat(out.h),
    instanceOf: out.instanceOf,
    count: out.count ? parseInt(out.count, 10) : undefined,
    color: out.color,
  }
}

function emit(args: Args): string {
  const opts: string[] = [
    `id: '${args.id}'`,
    `label: '${args.label.replace(/'/g, "\\'")}'`,
    `width: ${args.w}`,
    `depth: ${args.d}`,
    `height: ${args.h}`,
  ]
  if (args.color) opts.push(`color: '${args.color}'`)
  if (args.instanceOf) opts.push(`instanceOf: '${args.instanceOf}'`)
  if (args.count !== undefined) opts.push(`count: ${args.count}`)
  return `        { ${opts.join(', ')} },`
}

function main(): void {
  const args = parseArgs()
  const path = resolve(process.cwd(), 'src/data/chip-spec.ts')
  let src: string
  try {
    src = readFileSync(path, 'utf-8')
  } catch {
    console.error(`Could not read ${path}; run from frontend repo root.`)
    process.exit(1)
  }
  // Find the parent block and locate its children: [ ... ] array's closing bracket
  const parentRe = new RegExp(`id:\\s*['"]${args.parent}['"][\\s\\S]*?children:\\s*\\[`)
  const m = parentRe.exec(src)
  if (!m) {
    console.error(`Could not find parent '${args.parent}' with children: [...] in chip-spec.ts`)
    process.exit(2)
  }
  // Walk forward to find the matching closing bracket of the children array
  let depth = 1
  let i = m.index + m[0].length
  while (i < src.length && depth > 0) {
    const c = src[i]
    if (c === '[') depth++
    else if (c === ']') depth--
    if (depth === 0) break
    i++
  }
  if (depth !== 0) {
    console.error(`Could not find matching ] for parent '${args.parent}' children array`)
    process.exit(2)
  }
  // Insert before the closing ]
  const newEntry = '\n' + emit(args) + '\n      '
  const next = src.slice(0, i) + newEntry + src.slice(i)
  writeFileSync(path, next, 'utf-8')
  console.log(`✓ Added '${args.id}' as last child of '${args.parent}'`)
}

main()
