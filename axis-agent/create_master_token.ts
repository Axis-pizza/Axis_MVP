import { 
    Connection, Keypair, SystemProgram, Transaction, sendAndConfirmTransaction, 
    ComputeBudgetProgram, PublicKey 
} from '@solana/web3.js';
import { 
    createInitializeMintInstruction, MINT_SIZE, TOKEN_PROGRAM_ID, 
    getMinimumBalanceForRentExemptMint, getAssociatedTokenAddress, 
    createAssociatedTokenAccountInstruction, createMintToInstruction 
} from '@solana/spl-token';
import { 
    createCreateMetadataAccountV3Instruction 
} from '@metaplex-foundation/mpl-token-metadata';
import bs58 from 'bs58';
import dotenv from 'dotenv';
import path from 'path';

// 環境変数の読み込み
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const CONFIG = {
    name: "Axis Protocol ETF",
    symbol: "AXIS",
    uri: "https://axis-api.yusukekikuta-05.workers.dev/metadata/AXIS", 
    supply: 1_000_000_000n, // 10億枚
    decimals: 9,
};

// Metadata Program ID
const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

async function main() {
    // 1. セットアップ
    const privateKey = process.env.SERVER_PRIVATE_KEY;
    if (!privateKey) throw new Error("SERVER_PRIVATE_KEY is missing");
    
    const rpcUrl = process.env.HELIUS_RPC_URL || "https://api.devnet.solana.com";
    console.log(`🔌 RPC: ${rpcUrl}`);

    const connection = new Connection(rpcUrl, "confirmed");
    const wallet = Keypair.fromSecretKey(bs58.decode(privateKey));
    console.log(`👤 Admin: ${wallet.publicKey.toString()}`);

    // 2. Mintアドレス生成
    const mintKeypair = Keypair.generate();
    const mintAddress = mintKeypair.publicKey;
    console.log(`💎 Mint Address: ${mintAddress.toString()}`);

    // 3. トークン作成 (Create Mint)
    const lamports = await getMinimumBalanceForRentExemptMint(connection);
    // 優先手数料
    const priorityIx = ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 500_000 }); 

    const createMintTx = new Transaction().add(
        priorityIx,
        SystemProgram.createAccount({
            fromPubkey: wallet.publicKey,
            newAccountPubkey: mintAddress,
            space: MINT_SIZE,
            lamports,
            programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeMintInstruction(mintAddress, CONFIG.decimals, wallet.publicKey, null)
    );

    console.log("⏳ Creating Mint Account...");
    await sendAndConfirmTransaction(connection, createMintTx, [wallet, mintKeypair], { skipPreflight: true });
    console.log("✅ Mint Account Created");

    // 4. メタデータ登録 (v2 Low-Level API)
    console.log("⏳ Registering Metadata...");

    // PDA (Metadataのアドレス) を計算
    const [metadataPDA] = PublicKey.findProgramAddressSync(
        [
            Buffer.from("metadata"),
            TOKEN_METADATA_PROGRAM_ID.toBuffer(),
            mintAddress.toBuffer(),
        ],
        TOKEN_METADATA_PROGRAM_ID
    );

    // インストラクション作成
    const metadataIx = createCreateMetadataAccountV3Instruction(
        {
            metadata: metadataPDA,
            mint: mintAddress,
            mintAuthority: wallet.publicKey,
            payer: wallet.publicKey,
            updateAuthority: wallet.publicKey,
        },
        {
            createMetadataAccountArgsV3: {
                data: {
                    name: CONFIG.name,
                    symbol: CONFIG.symbol,
                    uri: CONFIG.uri,
                    sellerFeeBasisPoints: 0,
                    creators: null,
                    collection: null,
                    uses: null,
                },
                isMutable: true,
                collectionDetails: null,
            },
        }
    );

    const metadataTx = new Transaction().add(priorityIx, metadataIx);
    await sendAndConfirmTransaction(connection, metadataTx, [wallet], { skipPreflight: true });
    console.log("✅ Metadata Registered");

    // 5. 運営に10億枚発行
    console.log("⏳ Minting 1B tokens...");
    const adminATA = await getAssociatedTokenAddress(mintAddress, wallet.publicKey);
    
    const mintToTx = new Transaction().add(
        priorityIx,
        createAssociatedTokenAccountInstruction(wallet.publicKey, adminATA, wallet.publicKey, mintAddress),
        createMintToInstruction(mintAddress, adminATA, wallet.publicKey, CONFIG.supply * BigInt(10 ** CONFIG.decimals))
    );
    await sendAndConfirmTransaction(connection, mintToTx, [wallet], { skipPreflight: true });

    console.log("--------------------------------------------------");
    console.log("🎉 SUCCESS! Token Setup Complete.");
    console.log(`💎 Mint Address: ${mintAddress.toString()}`);
    console.log("--------------------------------------------------");
    console.log("👉 このMint Addressをバックエンドのコード(kagemusha.ts)にコピーしてください！");
}

main().catch(console.error);