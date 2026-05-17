import { Hono } from 'hono';
import { candlechart } from '../chart';
import type { Bindings } from '../../config/env.js';


const mockDb = {
    prepare: (sql: string) => ({
        bind: (..._args: any[]) => ({
            all: async () => {
                if (sql.includes('strategies')) return { results: compositionRows };
                if (sql.includes('token_prices')) return { results: tokenPriceRows };
                return { results: [] };
            },
        }),
    }),
};

// 範囲外の日付を指定した場合のモックDB（strategy は存在するが token_prices のデータがない）
const emptyMockDb = {
    prepare: (sql: string) => ({
        bind: (..._args: any[]) => ({
            all: async () => {
                if (sql.includes('strategies')) return { results: compositionRows };
                return { results: [] };
            },
        }),
    }),
};

// 先頭が欠損している場合のモックDB
const emptyTopMockDb = {
    prepare: (sql: string) => ({
        bind: (..._args: any[]) => ({
            all: async () => {
                if (sql.includes('strategies')) return { results: compositionRows };
                if (sql.includes('token_prices')) return { results: emptyTopTokenPriceRows };
                return { results: [] };
            },
        }),
    }),
};

// 30分ウィンドウがまるごと欠損している場合のモックDB
const emptyWindowMockDb = {
    prepare: (sql: string) => ({
        bind: (..._args: any[]) => ({
            all: async () => {
                if (sql.includes('strategies')) return { results: compositionRows };
                if (sql.includes('token_prices')) return { results: emptyWindowTokenPriceRows };
                return { results: [] };
            },
        }),
    }),
};

// strategies テーブルのモックデータ
const compositionRows = [
    { id: 'strategy-123', composition: '[{"symbol":"SOL","weight":50,"logoURI":"...","address":"So11111111111111111111111111111111111111112"},{"symbol":"USDC","weight":50,"logoURI":"...","address":"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"}]' },
];

// token_prices テーブルのモックデータ
const tokenPriceRows = [
    { token_name: 'SOL', recorded_at: "2026-03-30T23:30:00Z", price_usd: 60.0 },
    { token_name: 'USDC', recorded_at: "2026-03-30T23:30:00Z", price_usd: 1.0 },
    { token_name: 'SOL', recorded_at: "2026-03-30T23:35:00Z", price_usd: 59.0 },
    { token_name: 'USDC', recorded_at: "2026-03-30T23:35:00Z", price_usd: 1.0 },
    { token_name: 'SOL', recorded_at: "2026-03-30T23:40:00Z", price_usd: 58.5 },
    { token_name: 'USDC', recorded_at: "2026-03-30T23:40:00Z", price_usd: 1.0 },
    { token_name: 'SOL', recorded_at: "2026-03-30T23:45:00Z", price_usd: 60.0 },
    { token_name: 'USDC', recorded_at: "2026-03-30T23:45:00Z", price_usd: 1.0 },
    { token_name: 'SOL', recorded_at: "2026-03-30T23:50:00Z", price_usd: 60.5 },
    { token_name: 'USDC', recorded_at: "2026-03-30T23:50:00Z", price_usd: 1.0 },
    { token_name: 'SOL', recorded_at: "2026-03-30T23:55:00Z", price_usd: 60.0 },
    { token_name: 'USDC', recorded_at: "2026-03-30T23:55:00Z", price_usd: 1.0 },
    { token_name: 'SOL', recorded_at: "2026-03-31T00:00:00Z", price_usd: 61.0 },
    { token_name: 'USDC', recorded_at: "2026-03-31T00:00:00Z", price_usd: 1.0 },
    { token_name: 'SOL', recorded_at: "2026-03-31T00:05:00Z", price_usd: 60.0 },
    { token_name: 'USDC', recorded_at: "2026-03-31T00:05:00Z", price_usd: 1.0 },
    { token_name: 'SOL', recorded_at: "2026-03-31T00:10:00Z", price_usd: 60.0 },
    { token_name: 'USDC', recorded_at: "2026-03-31T00:10:00Z", price_usd: 1.0 },
    { token_name: 'SOL', recorded_at: "2026-03-31T00:15:00Z", price_usd: 60.0 },
    { token_name: 'USDC', recorded_at: "2026-03-31T00:15:00Z", price_usd: 1.0 },
    { token_name: 'SOL', recorded_at: "2026-03-31T00:20:00Z", price_usd: 60.0 },
    { token_name: 'USDC', recorded_at: "2026-03-31T00:20:00Z", price_usd: 1.0 },
    { token_name: 'SOL', recorded_at: "2026-03-31T00:25:00Z", price_usd: 60.0 },
    { token_name: 'USDC', recorded_at: "2026-03-31T00:25:00Z", price_usd: 1.0 },
    { token_name: 'SOL', recorded_at: "2026-03-31T00:30:00Z", price_usd: 60.0 },
    { token_name: 'USDC', recorded_at: "2026-03-31T00:30:00Z", price_usd: 1.0 },
    { token_name: 'SOL', recorded_at: "2026-03-31T01:35:00Z", price_usd: 59.5 },
    { token_name: 'USDC', recorded_at: "2026-03-31T01:35:00Z", price_usd: 1.0 },
    { token_name: 'SOL', recorded_at: "2026-03-31T01:40:00Z", price_usd: 60.0 },
    { token_name: 'USDC', recorded_at: "2026-03-31T01:40:00Z", price_usd: 1.0 },
    { token_name: 'SOL', recorded_at: "2026-03-31T01:45:00Z", price_usd: 60.0 },
    { token_name: 'USDC', recorded_at: "2026-03-31T01:45:00Z", price_usd: 1.0 },
    { token_name: 'SOL', recorded_at: "2026-03-31T01:50:00Z", price_usd: 60.0 },
    { token_name: 'USDC', recorded_at: "2026-03-31T01:50:00Z", price_usd: 1.0 },
    { token_name: 'SOL', recorded_at: "2026-03-31T01:55:00Z", price_usd: 60.0 },
    { token_name: 'USDC', recorded_at: "2026-03-31T01:55:00Z", price_usd: 1.0 },
];

// 先頭10分間分が欠損している場合のデータ
const emptyTopTokenPriceRows = [
    { token_name: 'SOL', recorded_at: "2026-03-30T23:40:00Z", price_usd: 58.5 },
    { token_name: 'USDC', recorded_at: "2026-03-30T23:40:00Z", price_usd: 1.0 },
    { token_name: 'SOL', recorded_at: "2026-03-30T23:45:00Z", price_usd: 60.0 },
    { token_name: 'USDC', recorded_at: "2026-03-30T23:45:00Z", price_usd: 1.0 },
    { token_name: 'SOL', recorded_at: "2026-03-30T23:50:00Z", price_usd: 60.5 },
    { token_name: 'USDC', recorded_at: "2026-03-30T23:50:00Z", price_usd: 1.0 },
    { token_name: 'SOL', recorded_at: "2026-03-30T23:55:00Z", price_usd: 60.0 },
    { token_name: 'USDC', recorded_at: "2026-03-30T23:55:00Z", price_usd: 1.0 },
    { token_name: 'SOL', recorded_at: "2026-03-31T00:00:00Z", price_usd: 61.0 },
    { token_name: 'USDC', recorded_at: "2026-03-31T00:00:00Z", price_usd: 1.0 },
    { token_name: 'SOL', recorded_at: "2026-03-31T00:05:00Z", price_usd: 60.0 },
    { token_name: 'USDC', recorded_at: "2026-03-31T00:05:00Z", price_usd: 1.0 },
    { token_name: 'SOL', recorded_at: "2026-03-31T00:10:00Z", price_usd: 60.0 },
    { token_name: 'USDC', recorded_at: "2026-03-31T00:10:00Z", price_usd: 1.0 },
    { token_name: 'SOL', recorded_at: "2026-03-31T00:15:00Z", price_usd: 60.0 },
    { token_name: 'USDC', recorded_at: "2026-03-31T00:15:00Z", price_usd: 1.0 },
    { token_name: 'SOL', recorded_at: "2026-03-31T00:20:00Z", price_usd: 60.0 },
    { token_name: 'USDC', recorded_at: "2026-03-31T00:20:00Z", price_usd: 1.0 },
    { token_name: 'SOL', recorded_at: "2026-03-31T00:25:00Z", price_usd: 60.0 },
    { token_name: 'USDC', recorded_at: "2026-03-31T00:25:00Z", price_usd: 1.0 },
    { token_name: 'SOL', recorded_at: "2026-03-31T00:30:00Z", price_usd: 60.0 },
    { token_name: 'USDC', recorded_at: "2026-03-31T00:30:00Z", price_usd: 1.0 },
    { token_name: 'SOL', recorded_at: "2026-03-31T01:35:00Z", price_usd: 59.5 },
    { token_name: 'USDC', recorded_at: "2026-03-31T01:35:00Z", price_usd: 1.0 },
    { token_name: 'SOL', recorded_at: "2026-03-31T01:40:00Z", price_usd: 60.0 },
    { token_name: 'USDC', recorded_at: "2026-03-31T01:40:00Z", price_usd: 1.0 },
    { token_name: 'SOL', recorded_at: "2026-03-31T01:45:00Z", price_usd: 60.0 },
    { token_name: 'USDC', recorded_at: "2026-03-31T01:45:00Z", price_usd: 1.0 },
    { token_name: 'SOL', recorded_at: "2026-03-31T01:50:00Z", price_usd: 60.0 },
    { token_name: 'USDC', recorded_at: "2026-03-31T01:50:00Z", price_usd: 1.0 },
    { token_name: 'SOL', recorded_at: "2026-03-31T01:55:00Z", price_usd: 60.0 },
    { token_name: 'USDC', recorded_at: "2026-03-31T01:55:00Z", price_usd: 1.0 },
];

// 00:00-00:30 ウィンドウがまるごと欠損しているデータ（Window1とWindow3のみ存在）
const emptyWindowTokenPriceRows = [
    { token_name: 'SOL', recorded_at: "2026-03-30T23:30:00Z", price_usd: 60.0 },
    { token_name: 'USDC', recorded_at: "2026-03-30T23:30:00Z", price_usd: 1.0 },
    { token_name: 'SOL', recorded_at: "2026-03-30T23:35:00Z", price_usd: 59.0 },
    { token_name: 'USDC', recorded_at: "2026-03-30T23:35:00Z", price_usd: 1.0 },
    { token_name: 'SOL', recorded_at: "2026-03-30T23:40:00Z", price_usd: 58.5 },
    { token_name: 'USDC', recorded_at: "2026-03-30T23:40:00Z", price_usd: 1.0 },
    { token_name: 'SOL', recorded_at: "2026-03-30T23:45:00Z", price_usd: 60.0 },
    { token_name: 'USDC', recorded_at: "2026-03-30T23:45:00Z", price_usd: 1.0 },
    { token_name: 'SOL', recorded_at: "2026-03-30T23:50:00Z", price_usd: 60.5 },
    { token_name: 'USDC', recorded_at: "2026-03-30T23:50:00Z", price_usd: 1.0 },
    { token_name: 'SOL', recorded_at: "2026-03-30T23:55:00Z", price_usd: 60.0 },
    { token_name: 'USDC', recorded_at: "2026-03-30T23:55:00Z", price_usd: 1.0 },
    // 00:00-00:30 のデータがまるごと欠損
    { token_name: 'SOL', recorded_at: "2026-03-31T00:30:00Z", price_usd: 60.0 },
    { token_name: 'USDC', recorded_at: "2026-03-31T00:30:00Z", price_usd: 1.0 },
    { token_name: 'SOL', recorded_at: "2026-03-31T01:35:00Z", price_usd: 59.5 },
    { token_name: 'USDC', recorded_at: "2026-03-31T01:35:00Z", price_usd: 1.0 },
    { token_name: 'SOL', recorded_at: "2026-03-31T01:40:00Z", price_usd: 60.0 },
    { token_name: 'USDC', recorded_at: "2026-03-31T01:40:00Z", price_usd: 1.0 },
    { token_name: 'SOL', recorded_at: "2026-03-31T01:45:00Z", price_usd: 60.0 },
    { token_name: 'USDC', recorded_at: "2026-03-31T01:45:00Z", price_usd: 1.0 },
    { token_name: 'SOL', recorded_at: "2026-03-31T01:50:00Z", price_usd: 60.0 },
    { token_name: 'USDC', recorded_at: "2026-03-31T01:50:00Z", price_usd: 1.0 },
    { token_name: 'SOL', recorded_at: "2026-03-31T01:55:00Z", price_usd: 60.0 },
    { token_name: 'USDC', recorded_at: "2026-03-31T01:55:00Z", price_usd: 1.0 },
];


// 各種計算結果の期待値
// candle1 (23:30-00:00): 23:30→30.5, 23:40→29.75(low), 23:50→30.75(high), 23:55→30.5(close)
// candle5 (01:30-02:00): 01:35→30.25(open), 01:40→30.5(high), 01:50→30.25(low), 01:55→30.5(close)
const candle1Start = Math.floor(new Date("2026-03-30T23:30:00Z").getTime() / 1000);
const candle1finish = Math.floor(new Date("2026-03-31T00:00:00Z").getTime() / 1000);
const candle5Start = Math.floor(new Date("2026-03-31T01:30:00Z").getTime() / 1000);
const candle5Finish = Math.floor(new Date("2026-03-31T02:00:00Z").getTime() / 1000);

// 正常時の期待値
const mockRows = [
    { datetime: [candle1Start, candle1finish], open: 30.5,  high: 30.75, low: 29.75, close: 30.5 },
    { datetime: [candle5Start, candle5Finish], open: 30.25, high: 30.5,  low: 30.25, close: 30.5 },
];

// 特定時刻のデータが欠損している場合の期待値
const emptyTopMockRows = [
    { datetime: [candle1Start, candle1finish], open: 29.75,  high: 30.75,  low: 29.75,  close: 30.5 },
    { datetime: [candle5Start, candle5Finish], open: 30.25,  high: 30.5,   low: 30.25,  close: 30.5 },
];

// 30分間のデータがまるごと欠損している場合の期待値
const emptyWindowMockRows = [
    { datetime: [candle1Start, candle1finish], open: 30.5, high: 30.75, low: 29.75, close: 30.5 },
    { datetime: [candle5Start, candle5Finish], open: 30.25, high: 30.5, low: 30.25, close: 30.5 },
];


// Hono アプリにルートを登録
const app = new Hono<{ Bindings: Bindings }>()
    .get('strategies/:id/candlechart', candlechart);


describe('GET /strategies/:id/candlechart', () => {
    // test.1 正常：データが揃っている場合、30分足OHLCを返す
    test('データが揃っている場合、30分足OHLCを返す', async () => {
        const res = await app.request(
            '/strategies/strategy-123/candlechart?period=7d',
            {},
            { axis_db: mockDb },
        );
        expect(res.status).toBe(200);
        const json = await res.json() as { success: boolean; data: unknown[] };
        console.log('=== expected ===');
        console.log(JSON.stringify(mockRows, null, 2));
        console.log('=== actual ===');
        console.log(JSON.stringify(json.data, null, 2));
        expect(json.success).toBe(true);
        expect(json.data[0]).toEqual(mockRows[0]);
        expect(json.data[json.data.length - 1]).toEqual(mockRows[1]);
    });

    // test.2 異常：範囲外の日付を指定した場合、null を返す
    test('範囲外の日付を指定した場合、null を返す', async () => {
        const res = await app.request(
            '/strategies/strategy-123/candlechart?period=7d',
            {},
            { axis_db: emptyMockDb },
        );
        expect(res.status).toBe(200);
        const json = await res.json() as { success: boolean; data: null };
        console.log('=== actual ===');
        console.log(JSON.stringify(json.data, null, 2));
        expect(json.success).toBe(true);
        expect(json.data).toBeNull();
    });

    // test.3 異常：30分間のうち特定の時間のデータが欠損している場合、存在するデータのみでOHLCを計算して返す
    test('30分間のうち特定の時間のデータが欠損している場合、存在するデータのみでOHLCを計算して返す', async () => {
        const res = await app.request(
            '/strategies/strategy-123/candlechart?period=7d',
            {},
            { axis_db: emptyTopMockDb },
        );
        expect(res.status).toBe(200);
        const json = await res.json() as { success: boolean; data: unknown[] };
        console.log('=== expected ===');
        console.log(JSON.stringify(emptyTopMockRows, null, 2));
        console.log('=== actual ===');
        console.log(JSON.stringify(json.data, null, 2));
        expect(json.success).toBe(true);
        expect(json.data[0]).toEqual(emptyTopMockRows[0]);
        expect(json.data[json.data.length - 1]).toEqual(emptyTopMockRows[1]);
    });

    // test.4 異常：30分間まるまるのデータがない場合、そのウィンドウをスキップして返す
    test('30分間まるまるのデータがない場合、そのウィンドウをスキップして返す', async () => {
        const res = await app.request(
            '/strategies/strategy-123/candlechart?period=7d',
            {},
            { axis_db: emptyWindowMockDb },
        );
        expect(res.status).toBe(200);
        const json = await res.json() as { success: boolean; data: unknown[] };
        console.log('=== expected ===');
        console.log(JSON.stringify(emptyWindowMockRows, null, 2));
        console.log('=== actual ===');
        console.log(JSON.stringify(json.data, null, 2));
        expect(json.success).toBe(true);
        expect(json.data[0]).toEqual(emptyWindowMockRows[0]);
        expect(json.data[json.data.length - 1]).toEqual(emptyWindowMockRows[1]);
    });
});