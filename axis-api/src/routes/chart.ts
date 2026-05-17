import { Context } from 'hono';
import { Bindings } from '../config/env.js';

// ラインチャート用のデータを返すエンドポイント
export async function linechart(c: Context<{ Bindings: Bindings }>) {
    const id = c.req.param('id');

    // strategyからcomposition(銘柄と比率)を取得
    const db = c.env.axis_db;
    const compositionResult = await db.prepare('SELECT composition FROM strategies WHERE id = ?').bind(id).all();
    if (!compositionResult.results.length) {
        return c.json({ success: true, data: [] });
    }
    const composition = JSON.parse(compositionResult.results[0].composition);

    // period(記録期間)の取得とパース
    const period = c.req.query('period') ?? '7d'

    // periodの形式に応じて基準日時を計算
    const now = new Date();
    let fromDate: Date;
    // dateの場合は日数を引く
    if (period.endsWith('d')) {
        const days = parseInt(period.slice(0, -1));
        fromDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    // 形式が不正な場合はエラーを返す
    } else {
        return c.json({ success: false, message: 'format is invalid' });
    }

    // token_prices テーブルから基準日時以降のデータを取得
    const tokenNamesResult = await db.prepare('SELECT token_name, recorded_at, price_usd FROM token_prices WHERE recorded_at >= ?').bind(fromDate.toISOString()).all();
    const filteredRows = tokenNamesResult.results.filter((row: any) => new Date(String(row.recorded_at)) >= fromDate);

    // 取得したデータを recorded_at ごとに token_name と price_usd をマッピング
    const priceMap = new Map();
    const data: { time: number; value: number }[] = []

    for (const row of filteredRows) {
        if (!priceMap.has(row.recorded_at)) {
            priceMap.set(row.recorded_at, new Map());
        }
        priceMap.get(row.recorded_at).set(row.token_name, row.price_usd);
    }

    // recorded_at ごとにチャートの値を計算
    for (const [recorded_at, tokenPrices] of priceMap) {
        let value = 0;
        for (const { symbol, weight } of composition) {
            const price = tokenPrices.get(symbol);
            if (price) {
                value += price * weight / 100;
            }
        }

        // Unix秒に変換
        const time = Math.floor(new Date(recorded_at).getTime() / 1000);
        data.push({ time, value })
    }
    return c.json({ success: true, data })
}

// ローソク足チャート用のデータを返すエンドポイント
export async function candlechart(c: Context<{ Bindings: Bindings }>) {
    const id = c.req.param('id');

    // strategyからcomposition(銘柄と比率)を取得
    const db = c.env.axis_db;
    const compositionResult = await db.prepare('SELECT composition FROM strategies WHERE id = ?').bind(id).all();
    if (!compositionResult.results.length) {
        return c.json({ success: true, data: [] });
    }
    const composition = JSON.parse(compositionResult.results[0].composition);

    // period(記録期間)の取得とパース
    const period = c.req.query('period') ?? '7d'

    // periodの形式に応じて基準日時を計算
    const now = new Date();
    let fromDate: Date;
    // dateの場合は日数を引く
    if (period.endsWith('d')) {
        const days = parseInt(period.slice(0, -1));
        fromDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    // 形式が不正な場合はエラーを返す
    } else {
        return c.json({ success: false, message: 'format is invalid' });
    }

    // token_prices テーブルから基準日時以降のデータを取得
    const tokenNamesResult = await db.prepare('SELECT token_name, recorded_at, price_usd FROM token_prices WHERE recorded_at >= ?').bind(fromDate.toISOString()).all();
    const filteredRows = tokenNamesResult.results.filter((row: any) => new Date(String(row.recorded_at)) >= fromDate);

    if (filteredRows.length === 0) {
        return c.json({ success: true, data: null });
    }

    // 取得したデータを recorded_at ごとに token_name と price_usd をマッピング
    const priceMap = new Map();

    for (const row of filteredRows) {
        if (!priceMap.has(row.recorded_at)) {
            priceMap.set(row.recorded_at, new Map());
        }
        priceMap.get(row.recorded_at).set(row.token_name, row.price_usd);
    }

    // recorded_at ごとの index 値を計算
    const indexValues: { time: number; value: number }[] = [];
    for (const [recorded_at, tokenPrices] of priceMap) {
        let value = 0;
        for (const { symbol, weight } of composition) {
            const price = tokenPrices.get(symbol);
            if (price) value += price * weight / 100;
        }
        // Unix秒に変換
        const time = Math.floor(new Date(recorded_at).getTime() / 1000);
        indexValues.push({ time, value });
    }
    // 時系列順にソート
    indexValues.sort((a, b) => a.time - b.time);

    // 30分足ごとにグループ化
    const CANDLE = 30 * 60;
    const candleMap = new Map<number, number[]>();
    // 各 index 値を対応するローソク足のグループに追加
    for (const { time, value } of indexValues) {
        const candleStart = Math.floor(time / CANDLE) * CANDLE;
        if (!candleMap.has(candleStart)) candleMap.set(candleStart, []);
        candleMap.get(candleStart)!.push(value);
    }

    // OHLC を計算して返す
    const data: { datetime: [number, number]; open: number; high: number; low: number; close: number }[] = [];
    for (const [candleStart, values] of [...candleMap.entries()].sort((a, b) => a[0] - b[0])) {
        const candleFinish = candleStart + CANDLE;
        data.push({
            datetime:  [candleStart, candleFinish],
            open:  values[0],
            high:  Math.max(...values),
            low:   Math.min(...values),
            close: values[values.length - 1],
        });
    }
    // これは何分足です
    return c.json({ success: true, data });
}