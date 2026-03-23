import { Hono } from 'hono';
import { chart } from '../../chart.js';
import type { Bindings } from '../../../config/env.js';


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


// strategies テーブルのモックデータ
const compositionRows = [
    { id: 'strategy-123', composition: '[{"symbol":"SOL","weight":50,"logoURI":"...","address":"So11111111111111111111111111111111111111112"},{"symbol":"USDC","weight":50,"logoURI":"...","address":"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"}]' },
];

// token_price テーブルのモックデータ
const tokenPriceRows = [
    { token_name: 'SOL', recorded_at: '2026-03-19T10:00:00Z', price_usd: 60.0 },
    { token_name: 'USDC', recorded_at: '2026-03-19T10:00:00Z', price_usd: 1.0 },
    { token_name: 'SOL', recorded_at: '2026-03-19T10:05:00Z', price_usd: 59.0 },
    { token_name: 'USDC', recorded_at: '2026-03-19T10:05:00Z', price_usd: 0.9 },

    // 8日以上過去のデータ
    { token_name: 'SOL', recorded_at: '2026-03-10T10:00:00Z', price_usd: 55.0 },
    { token_name: 'USDC', recorded_at: '2026-03-10T10:00:00Z', price_usd: 1.0 },
    { token_name: 'SOL', recorded_at: '2026-03-10T10:05:00Z', price_usd: 54.0 },
    { token_name: 'USDC', recorded_at: '2026-03-10T10:05:00Z', price_usd: 1.0 },
];

// token_price の一部データがないケース(今回USDCが欠損)
const partialTokenPriceRows = [
    { token_name: 'SOL', recorded_at: '2026-03-19T10:00:00Z', price_usd: 60.0 },
    { token_name: 'SOL', recorded_at: '2026-03-19T10:05:00Z', price_usd: 59.0 },
];

// 正常時の計算結果のモックデータ
const mockRows = [
    { time: 1773914400, value: 30.5 },
    { time: 1773914700, value: 29.95 },
];

// 異常：token_priceの一部が空のケースの計算結果のモックデータ
const partialTokenPriceMockRows = [
    { time: 1773914400, value: 30.0 },
    { time: 1773914700, value: 29.5 },
];

// 異常：token_priceの全てが空のケースの計算結果のモックデータ
const emptyTokenPriceMockRows : any[] = [];


// Hono アプリにルートを登録
const app = new Hono<{ Bindings: Bindings }>()
    .get('/:id/linechart', chart);


describe('GET /strategies/:id/linechart', () => {
    // test.1 正常：id と period が両方指定されている
    test('id と period が正しく指定された場合、データを返す', async () => {
        const res = await app.request(
            '/strategy-123/linechart?period=7d',
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
        expect(json.data).toEqual(mockRows);
    });

    // test.2 正常：period が指定されていない→7日で返す
    test('period が指定されていない場合、デフォルトの7日分のデータを返す', async () => {
        const res = await app.request(
            '/strategy-123/linechart',
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
        expect(json.data).toEqual(mockRows);
    });

    // test.3 異常：id が空→404を返す
    test('id が空の場合、404を返す', async () => {
        const res = await app.request(
            '/linechart?period=7d',
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
            '/strategy-123/linechart?period=7d',
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
        expect(json.data).toEqual(partialTokenPriceMockRows);
    });

    // test.5 異常：token_priceの全てが空→計算結果が空の配列になる
    test('DBにデータが全くない場合、空配列を返す', async () => {
        const res = await app.request(
            '/strategy-123/linechart?period=7d',
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
        expect(json.data).toEqual(emptyTokenPriceMockRows);
    });
});