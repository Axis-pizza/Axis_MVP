import { 
    Connection, Keypair, SystemProgram, Transaction, sendAndConfirmTransaction, 
    ComputeBudgetProgram 
} from '@solana/web3.js';
import { 
    createInitializeMintInstruction, MINT_SIZE, TOKEN_PROGRAM_ID, 
    getMinimumBalanceForRentExemptMint, getAssociatedTokenAddress, 
    createAssociatedTokenAccountInstruction, createMintToInstruction 
} from '@solana/spl-token';
import { createMetadataAccountV3 } from '@metaplex-foundation/mpl-token-metadata';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { createSignerFromKeypair, signerIdentity } from '@metaplex-foundation/umi';
import { fromWeb3JsKeypair, fromWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters';
import bs58 from 'bs58';
import dotenv from 'dotenv';

dotenv.config();

// ★ここがトークンの設定
const CONFIG = {
    name: "Axis Protocol ETF",
    symbol: "AXIS",
    // 既存のAPIにある画像を使う
    uri: "https://axis-api.yusukekikuta-05.workers.dev/metadata/AXIS", 
    supply: 1_000_000_000n, // 10億枚
    decimals: 9,
};

async function main() {
    const connection = new Connection(process.env.HELIUS_RPC_URL || "https://api.devnet.solana.com", "confirmed");
    const wallet = Keypair.fromSecretKey(bs58.decode(process.env.SERVER_PRIVATE_KEY!));
    
    console.log(`👤 Admin: ${wallet.publicKey.toString()}`);

    // 1. Mintアドレス生成
    const mintKeypair = Keypair.generate();
    const mintAddress = mintKeypair.publicKey;
    console.log(`💎 Mint Address: ${mintAddress.toString()}`);

    // 2. トークン作成 (Create Mint)
    const lamports = await getMinimumBalanceForRentExemptMint(connection);
    const priorityIx = ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 500_000 }); // 優先手数料

    const createTx = new Transaction().add(
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
    await sendAndConfirmTransaction(connection, createTx, [wallet, mintKeypair], { skipPreflight: true });
    console.log("✅ Token Created");

    // 3. メタデータ登録
    const umi = createUmi(connection.rpcEndpoint);
    const signer = createSignerFromKeypair(umi, fromWeb3JsKeypair(wallet));
    umi.use(signerIdentity(signer));

    await createMetadataAccountV3(umi, {
        mint: fromWeb3JsPublicKey(mintAddress),
        mintAuthority: signer,
        payer: signer,
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
    }).sendAndConfirm(umi, { send: { skipPreflight: true } });
    console.log("✅ Metadata Set");

    // 4. 運営に10億枚発行
    const adminATA = await getAssociatedTokenAddress(mintAddress, wallet.publicKey);
    const mintTx = new Transaction().add(
        priorityIx,
        createAssociatedTokenAccountInstruction(wallet.publicKey, adminATA, wallet.publicKey, mintAddress),
        createMintToInstruction(mintAddress, adminATA, wallet.publicKey, CONFIG.supply * BigInt(10 ** CONFIG.decimals))
    );
    await sendAndConfirmTransaction(connection, mintTx, [wallet], { skipPreflight: true });

    console.log("🎉 DONE! Admin now has 1B AXIS tokens.");
    console.log(`👉 Mint Address: ${mintAddress.toString()}`);
}

main().catch(console.error);