
export interface Vault {
  id: string;
  name: string;
  symbol: string;
  description: string;
  creator: string;
  strategy_type: string;
  management_fee: number;
  min_liquidity: number;
  composition: any; // Stored as string in DB, parsed to object
  image_url?: string;
  created_at?: string;
}

export async function getAllVaults(db: D1Database): Promise<Vault[]> {
    const { results } = await db.prepare("SELECT * FROM vaults ORDER BY created_at DESC").all();
    
    return results.map((v: any) => ({
      ...v,
      composition: v.composition ? JSON.parse(v.composition) : []
    })) as Vault[];
}

export async function createVault(db: D1Database, vault: Omit<Vault, 'created_at'>): Promise<void> {
     await db.prepare(`
      INSERT INTO vaults (
        id, name, symbol, description, creator, 
        strategy_type, management_fee, min_liquidity, composition, image_url
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      vault.id, 
      vault.name, 
      vault.symbol, 
      vault.description, 
      vault.creator, 
      vault.strategy_type, 
      vault.management_fee, 
      vault.min_liquidity, 
      JSON.stringify(vault.composition), 
      vault.image_url || null
    ).run();
}
