import { Context } from 'hono';
import { Bindings } from '../config/env.js';

// ラインチャート用のデータを返すエンドポイント
export async function getLineChartData(c: Context<{ Bindings: Bindings }>) {
    // パスパラメータから strategyId を取得
    const strategyId = c.req.param('id');
    const db = c.env.axis_db;

    // strategies テーブルから strategyId に対応する composition(銘柄と比率) のレコードを取得
    const strategyRecord = await db.prepare('SELECT composition FROM strategies WHERE id = ?').bind(strategyId).all();

    // 対象のレコードが存在しない場合は空のデータを返す
    if (!strategyRecord.results.length) {
        return c.json({ success: true, data: [] });
    }

    // JSON文字列をパースしてオブジェクトに変換
    const composition = JSON.parse(strategyRecord.results[0].composition as string);

    // クエリパラメータから period(記録期間) を取得（デフォルトは '7d'）
    const recordPeriod = c.req.query('period') ?? '7d'

    // periodの形式に応じて取得の基準日時（fromDate）を計算
    const now = new Date();
    let fromDate: Date;

    // 'd' (days) の場合は現在時刻から日数を引く
    if (recordPeriod.endsWith('d')) {
        const days = parseInt(recordPeriod.slice(0, -1));
        fromDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    // 形式が不正な場合はエラーを返す
    } else {
        return c.json({ success: false, message: 'format is invalid' });
    }

    // token_prices テーブルから基準日時以降の価格履歴を古い順で取得
    const priceHistoryResult = await db.prepare('SELECT token_name, recorded_at, price_usd FROM token_prices WHERE recorded_at >= ? ORDER BY recorded_at ASC').bind(fromDate.toISOString()).all();

    // 取得したデータの中から、基準日時以降のものだけを念のためフィルタリング
    const targetPeriodPrices = priceHistoryResult.results.filter((row: any) => new Date(String(row.recorded_at)) >= fromDate);

    // タイムスタンプごとに各トークン価格をまとめるための Map
    const pricesByTimestamp = new Map();
    // 最終的にフロントエンドに返すチャート用データ(時間と価格)の配列
    const linechartData: { time: number; value: number }[] = []

    // 取得したレコードを recorded_at ごとに整理して Map に格納
    for (const priceRecord of targetPeriodPrices) {
        if (!pricesByTimestamp.has(priceRecord.recorded_at)) {
            pricesByTimestamp.set(priceRecord.recorded_at, new Map());
        }
        pricesByTimestamp.get(priceRecord.recorded_at).set(priceRecord.token_name, priceRecord.price_usd);
    }

    // recorded_at ごとにインデックス全体の価格（チャートの値）を計算
    for (const [recordedAt, tokenPrices] of pricesByTimestamp) {
        let calculatedIndexValue = 0;
        for (const { symbol, weight } of composition) {
            const price = tokenPrices.get(symbol);
            if (price) {
                calculatedIndexValue += price * weight / 100;
            }
        }

        // 扱いやすいように Unix timestamp (秒) に変換
        const unixTimestamp = Math.floor(new Date(recordedAt).getTime() / 1000);
        linechartData.push({ time: unixTimestamp, value: calculatedIndexValue });
    }

    return c.json({ success: true, data: linechartData });
}