import type { DomainRiskLevel } from '../types/index.js';

const HIGH_RISK_PATTERNS: RegExp[] = [
  /\b(chase|bankofamerica|wellsfargo|citibank?|barclays|hsbc|santander|capitalone|usbank|tdbank|pnc|schwab|fidelity|vanguard|etrade|robinhood|sofi)\b/i,
  /\b(coinbase|binance|kraken|gemini|bitfinex|kucoin|okx|bybit|metamask|ledger|trezor|uniswap|opensea)\b/i,
  /\b(console\.aws|portal\.azure|cloud\.google|admin\.google|github\.com|gitlab\.com|bitbucket\.org|digitalocean|heroku|vercel|netlify)\b/i,
  /\b(paypal|stripe|square|braintree|adyen)\b/i,
  /\b(healthcare\.gov|irs\.gov|ssa\.gov|medicare\.gov)\b/i,
];

const MEDIUM_RISK_PATTERNS: RegExp[] = [
  /\b(mail\.google|gmail|outlook|yahoo\.com|proton\.me|fastmail)\b/i,
  /\b(office\.com|microsoft\.com|apple\.com|amazon\.com)\b/i,
  /\b(linkedin|slack|atlassian|jira|confluence)\b/i,
];

export function getRiskLevel(hostname: string): DomainRiskLevel {
  const h = hostname.toLowerCase();
  if (HIGH_RISK_PATTERNS.some((re) => re.test(h))) return 'high';
  if (MEDIUM_RISK_PATTERNS.some((re) => re.test(h))) return 'medium';
  return 'low';
}
