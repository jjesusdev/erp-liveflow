import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate, formatTime, timeAgo } from '@/lib/date-utils';

describe('formatCurrency', () => {
  it('formats MXN currency with 2 decimals', () => {
    const result = formatCurrency(1500);
    expect(result).toContain('1,500.00');
    expect(result).toContain('$');
  });

  it('formats zero', () => {
    const result = formatCurrency(0);
    expect(result).toContain('0.00');
  });

  it('formats negative amounts', () => {
    const result = formatCurrency(-250.5);
    expect(result).toContain('250.50');
    expect(result).toContain('-');
  });

  it('formats with custom currency', () => {
    const result = formatCurrency(100, 'USD');
    expect(result).toContain('100.00');
  });
});

describe('formatDate', () => {
  it('returns empty string for null', () => {
    expect(formatDate(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(formatDate(undefined)).toBe('');
  });

  it('formats a valid date string in Spanish', () => {
    const result = formatDate('2026-01-15T12:00:00');
    expect(result).toContain('15');
    expect(result).toContain('enero');
    expect(result).toContain('2026');
  });

  it('formats a Date object', () => {
    const result = formatDate(new Date(2026, 5, 20));
    expect(result).toContain('20');
    expect(result).toContain('junio');
  });
});

describe('formatTime', () => {
  it('returns empty string for null', () => {
    expect(formatTime(null)).toBe('');
  });

  it('formats time in HH:mm', () => {
    const result = formatTime(new Date(2026, 0, 15, 14, 30));
    expect(result).toBe('14:30');
  });
});

describe('timeAgo', () => {
  it('returns empty string for null', () => {
    expect(timeAgo(null)).toBe('');
  });

  it('returns a relative time string', () => {
    const past = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const result = timeAgo(past);
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });
});
