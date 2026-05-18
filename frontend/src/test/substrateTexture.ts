/**
 * Procedural substrate texture — shared by asset 02 (RestingTileAsset) and
 * asset 03 (HoverFrameAsset). The pattern reads through translucent tiles
 * above and gives the "circuit board cell lattice" feel from page-0002.
 *
 *   - Dark base                       — #0a1224
 *   - Tight horizontal rows (6 px)    — memory-row feel
 *   - Wider vertical columns (32 px)  — channel separators
 *   - ~240 scattered bright pixels    — transistor / SRAM highlights
 *
 * Returned as a CanvasTexture so callers can plug it into a material's
 * `emissiveMap` (self-illuminating → reads through translucent tiles).
 */
import { useMemo } from 'react'
import * as THREE from 'three'

export function useSubstrateTexture() {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 1024
    c.height = 1024
    const ctx = c.getContext('2d')!

    // Base
    ctx.fillStyle = '#0a1224'
    ctx.fillRect(0, 0, 1024, 1024)

    // Horizontal rows (every 6 px) — memory-row feel
    ctx.strokeStyle = '#152340'
    ctx.lineWidth = 1
    for (let y = 0; y < 1024; y += 6) {
      ctx.beginPath()
      ctx.moveTo(0, y + 0.5)
      ctx.lineTo(1024, y + 0.5)
      ctx.stroke()
    }

    // Wider vertical columns (every 32 px) — channel separator feel
    ctx.strokeStyle = '#1c3055'
    ctx.lineWidth = 2
    for (let x = 0; x < 1024; x += 32) {
      ctx.beginPath()
      ctx.moveTo(x + 0.5, 0)
      ctx.lineTo(x + 0.5, 1024)
      ctx.stroke()
    }

    // Scattered brighter cells — transistor / SRAM highlights
    for (let i = 0; i < 240; i++) {
      const x = Math.floor(Math.random() * 256) * 4
      const y = Math.floor(Math.random() * 1024)
      const s = 2 + Math.floor(Math.random() * 3)
      const a = 0.3 + Math.random() * 0.55
      ctx.fillStyle = `rgba(96, 174, 232, ${a})`
      ctx.fillRect(x, y, s, s)
    }

    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 8
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping
    return tex
  }, [])
}
