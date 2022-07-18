import {PublicKey, Keypair} from '@solana/web3.js';
import * as anchor from '@project-serum/anchor';
import {Program} from '@project-serum/anchor';
import {Invite} from '../../target/types/invite';

const {SystemProgram} = anchor.web3;
const provider = anchor.getProvider();
const invitationPrefix = Buffer.from("invite");

let inviteMap = new Map<string, PublicKey>();

export const invitationProgram = anchor.workspace.Invite as Program<Invite>;

export async function getInviteAccount(key: PublicKey) {
    const seed = [invitationPrefix, key.toBuffer()];
    const [account, _] = await anchor.web3.PublicKey.findProgramAddress(seed, invitationProgram.programId);
    return account;
}

export async function sendInvite(from_user: Keypair, to: PublicKey, feePayer: PublicKey) {
    const inviteAccount = await getInviteAccount(from_user.publicKey)
    const toInviteAccount = await getInviteAccount(to)
    const tx = await invitationProgram.methods.sendInvite()
        .accounts({
            inviteAccount: inviteAccount,
            toInviteAccount: toInviteAccount,
            to: to,
            authority: from_user.publicKey,
            systemProgram: SystemProgram.programId
        })
        .transaction();
    tx.feePayer = feePayer;
    tx.recentBlockhash = (await provider.connection.getRecentBlockhash()).blockhash;
    tx.sign(from_user);
    await provider.sendAndConfirm(tx);
    return [inviteAccount, toInviteAccount];
}

export async function getInviteSingleton(user: PublicKey) {
    const key = user.toString()
    if(inviteMap.has(key)) {
        return inviteMap.get(key)
    }
    const inviteAccount = await getInviteAccount(user);
    await invitationProgram.methods.initialize()
        .accounts({
            inviteAccount: inviteAccount,
            authority: user,
            payer: user,
            systemProgram: SystemProgram.programId
        }).rpc();
    inviteMap.set(key, inviteAccount);
    return inviteAccount;
}
