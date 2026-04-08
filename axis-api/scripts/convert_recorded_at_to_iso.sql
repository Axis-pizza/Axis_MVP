-- 現在YYYY/MM/DD HH:mm:ssの形式で保存されているcreated_atをYYYY-MM-DDTHH:mm:ssZの形式に変換

UPDATE token_prices SET recorded_at = REPLACE(REPLACE(recorded_at, '/', '-'), ' ', 'T') || '.000Z';