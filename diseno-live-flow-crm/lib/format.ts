const mxn = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function money(amount: number) {
  return `$${mxn.format(amount)}`
}

export function clock(totalSec: number) {
  const s = Math.max(0, totalSec)
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function makeReference(seed: number) {
  let x = Math.floor(seed) | 0
  let out = ''
  for (let i = 0; i < 8; i++) {
    x = (x + 0x6d2b79f5) | 0
    let t = Math.imul(x ^ (x >>> 15), x | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    out += ALPHABET[((t ^ (t >>> 14)) >>> 0) % ALPHABET.length]
  }
  return out
}
