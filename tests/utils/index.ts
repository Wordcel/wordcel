import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { PublicKey, LAMPORTS_PER_SOL, SystemProgram } from '@solana/web3.js';
import randombytes from 'randombytes';
import { Wordcel } from '../../target/types/wordcel';

const provider = anchor.getProvider();

export async function airdrop(key: PublicKey) {
    const airdropSig = await provider.connection.requestAirdrop(key, 1 * LAMPORTS_PER_SOL);
    return provider.connection.confirmTransaction(airdropSig);
}

export async function setupProfile(pubkey: PublicKey, program: Program<Wordcel>) {
    const randomHash = randombytes(32);
    const profileSeed = [Buffer.from("profile"), randomHash];
    const [profileAccount] = await anchor.web3.PublicKey.findProgramAddress(profileSeed, program.programId);
    const profileTx = await program.methods
        .initialize(randomHash)
        .accounts({
            profile: profileAccount,
            user: pubkey,
            systemProgram: SystemProgram.programId,
        })
        .transaction();
    profileTx.feePayer = pubkey;
    profileTx.recentBlockhash = (await provider.connection.getLatestBlockhash()).blockhash;

    return { profileAccount, profileTx };
}