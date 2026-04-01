import { Context } from 'hono';
import { Bindings } from '../config/env.js';

// ラインチャート描画用のデータを取得して計算・整形する関数
export async function getLineChartData(c: Context<{ Bindings: Bindings }>) {
    // リクエストから取得したETFのID
    const id = c.req.param('id');
    const db = c.env.axis_db;

    // 対象ETFの構成情報(銘柄と比率)をDBから取得
    const strategiesResult = await db.prepare('SELECT composition FROM strategies WHERE id = ?').bind(id).all();
    if (!strategiesResult.results.length) {
        return c.json({ success: true, data: [] });
    }

    // JSONからパースした構成銘柄と比率の配列
    const composition = JSON.parse(strategiesResult.results[0].composition);

    // URLのクエリパラメータから基準日を取得
    const endDateParam = c.req.query('end_date');

    // 指定があればその日付、なければ現在時刻を基準（endDate）とする
    const endDate = endDateParam ? new Date(endDateParam) : new Date();
    // 不正な日付フォーマットが送られてきた場合のエラーハンドリング
    if (isNaN(endDate.getTime())) {
        return c.json({ success: false, message: 'Invalid end_date format' }, 400);
    }

    // 基準日（endDate）から7日前の時間を起点（fromDate）とする
    const fromDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    // fromDate（7日前）から endDate（基準日）までの期間をピンポイントで取得
    const priceRecord = await db.prepare(
        'SELECT token_name, recorded_at, price_usd FROM token_prices WHERE recorded_at >= ? AND recorded_at <= ? ORDER BY recorded_at ASC'
    ).bind(fromDate.toISOString(), endDate.toISOString()).all();

    // タイムスタンプごとに各トークン価格をまとめるためのMap
    const priceByTimestamp = new Map();
    // フロントエンドに返すチャート用データ(時間と価格)の配列
    const data: { time: number; value: number }[] = [];

    // 取得したデータを recorded_at ごとに token_name と price_usd をマッピング
    for (const row of priceRecord.results) {
        if (!priceByTimestamp.has(row.recorded_at)) {
            priceByTimestamp.set(row.recorded_at, new Map());
        }
        priceByTimestamp.get(row.recorded_at).set(row.token_name, row.price_usd);
    }

    // recorded_at ごとにチャートの値を計算
    for (const [recorded_at, tokenPrices] of priceByTimestamp) {
        let value = 0;
        for (const { symbol, weight } of composition) {
            const price = tokenPrices.get(symbol);
            if (price) {
                value += price * weight / 100;
            }
        }

        // Unix秒に変換
        const unixtime = Math.floor(new Date(recorded_at).getTime() / 1000);
        data.push({ time: unixtime, value });
    }
    return c.json({ success: true, data });
}