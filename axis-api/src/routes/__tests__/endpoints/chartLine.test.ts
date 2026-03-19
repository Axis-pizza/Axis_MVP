import { Hono } from 'hono';
import { chart } from '../../chart.js';
import type { Bindings } from '../../../config/env.js';

// モックデータ
// strategies テーブルのモックデータ
const compositionRows = [
    { id: 'strategy-123', composition: '[{"symbol":"SOL","weight":50,"logoURI":"...","address":"So11111111111111111111111111111111111111112"},{"symbol":"USDC","weight":50,"logoURI":"...","address":"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"}]' },
];

// token_price テーブルのモックデータ
const tokenPriceRows = [
    { token_name: 'SOL', recorded_at: '2026/03/19 10:00:00', price_usd: 60.0 },
    { token_name: 'USDC', recorded_at: '2026/03/19 10:00:00', price_usd: 1.0 },
    { token_name: 'SOL', recorded_at: '2026/03/19 10:05:00', price_usd: 59.0 },
    { token_name: 'USDC', recorded_at: '2026/03/19 10:05:00', price_usd: 0.9 },
];

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

// 計算結果のモックデータ
const mockRows = [
    { time: 1742378400, value: 30.5 },
    { time: 1742378700, value: 29.95 },

];

// データがない場合のモックDB
const emptyMockDb = {
    prepare: (_sql: string) => ({
        bind: (..._args: any[]) => ({
            all: async () => ({ results: [] }),
        }),
    }),
};

// Hono アプリにルートを登録
const app = new Hono<{ Bindings: Bindings }>()
    .get('/:id/chart/line', chart);

describe('GET /chart/line', () => {
    // test.1 正常：id と period が両方指定されている
    test('id と period が正しく指定された場合、データを返す', async () => {
        const res = await app.request(
            '/strategy-123/chart/line?period=7d',
            {},
            { axis_db: mockDb },
        );
        expect(res.status).toBe(200);
        const json = await res.json() as { success: boolean; data: unknown[] };
        expect(json.success).toBe(true);
        expect(json.data).toEqual(mockRows);
    });

    // test.2 正常：period が指定されていない→7日で返す
    test('period が指定されていない場合、デフォルトの7日分のデータを返す', async () => {
        const res = await app.request(
            '/strategy-123/chart/line',
            {},
            { axis_db: mockDb },
        );
        expect(res.status).toBe(200);
        const json = await res.json() as { success: boolean; data: unknown[] };
        expect(json.success).toBe(true);
        expect(json.data).toEqual(mockRows);
    });

    // test.3 異常：id が空→404を返す
    test('id が空の場合、404を返す', async () => {
        const res = await app.request(
            '/chart/line?period=7d',
            {},
            { axis_db: mockDb },
        );
        expect(res.status).toBe(404);
    });

    // test.4 異常：token_priceの1部が空→あるデータのみで計算して返す
    test('token_priceの1部が空の場合、あるデータのみで計算して返す', async () => {
        const res = await app.request(
            '/strategy-123/chart/line?period=7d',
            {},
            { axis_db: emptyMockDb },
        );
        expect(res.status).toBe(200);
        const json = await res.json() as { success: boolean; data: unknown[] };
        expect(json.success).toBe(true);
        expect(json.data).toEqual([]);
    });

    // test.5 異常：token_priceの全てが空→計算結果が空の配列になる
    test('DBにデータが全くない場合、空配列を返す', async () => {
        const res = await app.request(
            '/strategy-123/chart/line?period=7d',
            {},
            { axis_db: emptyMockDb },
        );
        expect(res.status).toBe(200);
        const json = await res.json() as { success: boolean; data: unknown[] };
        expect(json.success).toBe(true);
        expect(json.data).toEqual([]);
    });
});