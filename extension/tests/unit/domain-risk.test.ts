import { describe, it, expect } from 'vitest';
import { getRiskLevel } from '../../src/background/domain-risk';

describe('getRiskLevel', () => {
  it('classifies banking domains as high risk', () => {
    expect(getRiskLevel('chase.com')).toBe('high');
    expect(getRiskLevel('bankofamerica.com')).toBe('high');
    expect(getRiskLevel('wellsfargo.com')).toBe('high');
    expect(getRiskLevel('online.citibank.com')).toBe('high');
  });

  it('classifies crypto domains as high risk', () => {
    expect(getRiskLevel('coinbase.com')).toBe('high');
    expect(getRiskLevel('binance.com')).toBe('high');
    expect(getRiskLevel('metamask.io')).toBe('high');
  });

  it('classifies cloud admin domains as high risk', () => {
    expect(getRiskLevel('console.aws.amazon.com')).toBe('high');
    expect(getRiskLevel('portal.azure.com')).toBe('high');
    expect(getRiskLevel('github.com')).toBe('high');
  });

  it('classifies email domains as medium risk', () => {
    expect(getRiskLevel('mail.google.com')).toBe('medium');
    expect(getRiskLevel('outlook.live.com')).toBe('medium');
  });

  it('classifies unknown domains as low risk', () => {
    expect(getRiskLevel('example.com')).toBe('low');
    expect(getRiskLevel('news.ycombinator.com')).toBe('low');
  });
});
