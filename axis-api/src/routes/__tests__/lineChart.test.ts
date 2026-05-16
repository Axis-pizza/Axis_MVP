import { Hono } from 'hono';
import { getLineChartData } from '../chart';
import type { Bindings } from '../../config/env.js';


// モックデータ
// モックDB
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

// token_price の一部データがないケースのモックDB
const partialMockDb = {
    prepare: (sql: string) => ({
        bind: (..._args: any[]) => ({
            all: async () => {
                if (sql.includes('strategies')) return { results: compositionRows };
                if (sql.includes('token_prices')) return { results: partialTokenPriceRows };
                return { results: [] };
            },
        }),
    }),
};

// token_price の全てのデータがないケースのモックDB
const emptyMockDb = {
    prepare: (_sql: string) => ({
        bind: (..._args: any[]) => ({
            all: async () => ({ results: [] }),
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


// strategies テーブルのモックデータ
const compositionRows = [
    { id: 'strategy-123', composition: '[{"symbol":"SOL","weight":50,"logoURI":"...","address":"So11111111111111111111111111111111111111112"},{"symbol":"USDC","weight":50,"logoURI":"...","address":"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"}]' },
];

// token_prices テーブルのモックデータ
const tokenPriceRows = [
    { token_name: 'SOL', recorded_at: "2026-03-30T23:45:00Z", price_usd: 60.0 },
    { token_name: 'USDC', recorded_at: "2026-03-30T23:45:00Z", price_usd: 1.0 },
    { token_name: 'SOL', recorded_at: "2026-03-30T23:50:00Z", price_usd: 59.0 },
    { token_name: 'USDC', recorded_at: "2026-03-30T23:50:00Z", price_usd: 0.9 },
    { token_name: 'SOL', recorded_at: "2026-03-30T23:55:00Z", price_usd: 59.0 },
    { token_name: 'USDC', recorded_at: "2026-03-30T23:55:00Z", price_usd: 0.95 },
    { token_name: 'SOL', recorded_at: "2026-03-31T00:00:00Z", price_usd: 58.0 },
    { token_name: 'USDC', recorded_at: "2026-03-31T00:00:00Z", price_usd: 1.0 },
    { token_name: 'SOL', recorded_at: "2026-03-31T00:05:00Z", price_usd: 58.0 },
    { token_name: 'USDC', recorded_at: "2026-03-31T00:05:00Z", price_usd: 1.0 },
    { token_name: 'SOL', recorded_at: "2026-03-31T00:10:00Z", price_usd: 57.0 },
    { token_name: 'USDC', recorded_at: "2026-03-31T00:10:00Z", price_usd: 1.0 },
];

// token_price の一部データがないケース(今回USDCが欠損)
const partialTokenPriceRows = [
    { token_name: 'SOL', recorded_at: "2026-03-30T23:45:00Z", price_usd: 60.0 },
    { token_name: 'SOL', recorded_at: "2026-03-30T23:50:00Z", price_usd: 59.0 },
    { token_name: 'SOL', recorded_at: "2026-03-30T23:55:00Z", price_usd: 59.0 },
    { token_name: 'SOL', recorded_at: "2026-03-31T00:00:00Z", price_usd: 58.0 },
    { token_name: 'SOL', recorded_at: "2026-03-31T00:05:00Z", price_usd: 58.0 },
    { token_name: 'SOL', recorded_at: "2026-03-31T00:10:00Z", price_usd: 57.0 },
];

// 先頭が欠損している場合のデータ
const emptyTopTokenPriceRows = [
    { token_name: 'SOL', recorded_at: "2026-03-30T23:55:00Z", price_usd: 59.0 },
    { token_name: 'USDC', recorded_at: "2026-03-30T23:55:00Z", price_usd: 0.95 },
    { token_name: 'SOL', recorded_at: "2026-03-31T00:00:00Z", price_usd: 58.0 },
    { token_name: 'USDC', recorded_at: "2026-03-31T00:00:00Z", price_usd: 1.0 },
    { token_name: 'SOL', recorded_at: "2026-03-31T00:05:00Z", price_usd: 58.0 },
    { token_name: 'USDC', recorded_at: "2026-03-31T00:05:00Z", price_usd: 1.0 },
    { token_name: 'SOL', recorded_at: "2026-03-31T00:10:00Z", price_usd: 57.0 },
    { token_name: 'USDC', recorded_at: "2026-03-31T00:10:00Z", price_usd: 1.0 },
];

// 正常時の計算結果のモックデータ
// 最初と最後のデータが合っているかを確かめる
const mock_unix_first = Math.floor(new Date("2026-03-30T23:45:00Z").getTime() / 1000);
const mock_unix_last = Math.floor(new Date("2026-03-31T00:10:00Z").getTime() / 1000);
const mockRows = [
    { time: mock_unix_first, value: 30.5 },
    { time: mock_unix_last, value: 29.0 },
];

// 異常：token_priceの一部が空のケースの計算結果のモックデータ
const partialTokenPriceMockRows = [
    { time: mock_unix_first, value: 30.0 },
    { time: mock_unix_last, value: 28.5 },
];

// 異常：token_priceの全てが空のケースの計算結果のモックデータ
const emptyTokenPriceMockRows : any[] = [];

// 異常：先頭が欠損しているケースの計算結果のモックデータ
const mock_unix_top_first = Math.floor(new Date("2026-03-30T23:55:00Z").getTime() / 1000);
const emptyTopMockRows = [
    { time: mock_unix_top_first, value: 29.975 },
    { time: mock_unix_last, value: 29.0 },
];


// Hono アプリにルートを登録
const app = new Hono<{ Bindings: Bindings }>()
    .get('strategies/:id/linechart', getLineChartData);


describe('GET /strategies/:id/linechart', () => {
    // test.1 正常：id と period が両方指定されている
    test('id と period が正しく指定された場合、データを返す', async () => {
        const res = await app.request(
            '/strategies/strategy-123/linechart?period=7d',
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

    // test.2 正常：period が指定されていない→7日で返す
    test('period が指定されていない場合、デフォルトの7日分のデータを返す', async () => {
        const res = await app.request(
            '/strategies/strategy-123/linechart',
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

    // test.3 異常：id が空→404を返す
    test('id が空の場合、404を返す', async () => {
        const res = await app.request(
            '/strategies/linechart?period=7d',
            {},
            { axis_db: mockDb },
        );
        expect(res.status).toBe(404);
        console.log('=== actual status ===');
        console.log(res.status);
    });

    // test.4 異常：token_priceの1部が空→あるデータのみで計算して返す
    test('token_priceの1部が空の場合、あるデータのみで計算して返す', async () => {
        const res = await app.request(
            '/strategies/strategy-123/linechart?period=7d',
            {},
            { axis_db: partialMockDb },
        );
        expect(res.status).toBe(200);
        const json = await res.json() as { success: boolean; data: unknown[] };
        console.log('=== expected ===');
        console.log(JSON.stringify(partialTokenPriceMockRows, null, 2));
        console.log('=== actual ===');
        console.log(JSON.stringify(json.data, null, 2));
        expect(json.success).toBe(true);
        expect(json.data[0]).toEqual(partialTokenPriceMockRows[0]);
        expect(json.data[json.data.length - 1]).toEqual(partialTokenPriceMockRows[1]);
    });

    // test.5 異常：token_priceの全てが空→計算結果が空の配列になる
    test('DBにデータが全くない場合、空配列を返す', async () => {
        const res = await app.request(
            '/strategies/strategy-123/linechart?period=7d',
            {},
            { axis_db: emptyMockDb },
        );
        expect(res.status).toBe(200);
        const json = await res.json() as { success: boolean; data: unknown[] };
        console.log('=== expected ===');
        console.log(JSON.stringify(emptyTokenPriceMockRows, null, 2));
        console.log('=== actual ===');
        console.log(JSON.stringify(json.data, null, 2));
        expect(json.success).toBe(true);
        expect(json.data[0]).toEqual(emptyTokenPriceMockRows[0]);
        expect(json.data[json.data.length - 1]).toEqual(emptyTokenPriceMockRows[1]);
    });

    // test.6 先頭が欠損している場合→あるデータのみで計算して返す
    test('先頭のデータがない場合、あるデータのみで計算して返す', async () => {
        const res = await app.request(
            '/strategies/strategy-123/linechart?period=7d',
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
});