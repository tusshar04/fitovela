export const FITOVELA_AD_ACCOUNT = '1457307065897121';
export const FITOVELA_BUSINESS = '1110506178493480';
const API = 'https://graph.facebook.com/v25.0';
const HOUR_FIELD = 'hourly_stats_aggregated_by_advertiser_time_zone';

export interface SpendRow {
  adId: string;
  adName: string;
  campaignId: string;
  hour: number;
  spend: number;
}

export function parseSpendRows(input: unknown, date: string): SpendRow[] {
  if (!Array.isArray(input)) throw new Error('Meta spend response missing');
  return input.map(value => {
    const r = value as Record<string, unknown>;
    const range = typeof r[HOUR_FIELD] === 'string' ? r[HOUR_FIELD] as string : '';
    const hour = Number(range.slice(0, 2));
    const spend = Number(r.spend);
    if (r.date_start !== date || r.date_stop !== date || !/^\d{2}:00:00 - \d{2}:59:59$/.test(range) || hour > 23 || !Number.isFinite(spend) || spend < 0 || r.spend == null || !/^\d+$/.test(String(r.ad_id))) throw new Error('Invalid Meta spend row');
    return { adId: String(r.ad_id), adName: String(r.ad_name ?? r.ad_id), campaignId: String(r.campaign_id), hour, spend };
  });
}

/** GET-only observer. Account, currency and time zone are verified on every run. */
export async function fetchMetaSpend(date: string): Promise<SpendRow[]> {
  const token = process.env.META_MARKETING_ACCESS_TOKEN;
  if (!token) throw new Error('Meta access token not configured');
  async function read(path: string, params: Record<string, string>) {
    const url = new URL(`${API}/${path}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: AbortSignal.timeout(10_000), redirect: 'error' });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(`Meta unavailable (HTTP ${res.status}, code ${Number(data.error?.code) || 0})`);
    return data;
  }
  const account = await read(`act_${FITOVELA_AD_ACCOUNT}`, { fields: 'account_id,currency,timezone_name,business' });
  if (account.account_id !== FITOVELA_AD_ACCOUNT || account.currency !== 'INR' || !['Asia/Kolkata', 'Asia/Calcutta'].includes(account.timezone_name) || account.business?.id !== FITOVELA_BUSINESS) throw new Error('Meta account identity mismatch');
  const rows: SpendRow[] = [];
  let after = '';
  // Cursor pagination only: never follow a returned URL that could expose a token.
  for (let page = 0; page < 5; page++) {
    const data = await read(`act_${FITOVELA_AD_ACCOUNT}/insights`, {
      fields: 'ad_id,ad_name,campaign_id,spend,date_start,date_stop', level: 'ad',
      time_range: JSON.stringify({ since: date, until: date }),
      breakdowns: HOUR_FIELD, limit: '500', ...(after ? { after } : {}),
    });
    rows.push(...parseSpendRows(data.data, date));
    if (!data.paging?.next) return rows;
    if (!data.paging?.cursors?.after || data.paging.cursors.after === after) throw new Error('Invalid Meta pagination');
    after = data.paging.cursors.after;
  }
  throw new Error('Meta report exceeded page limit; totals withheld');
}
