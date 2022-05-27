import * as anchor from '@project-serum/anchor';
import {Program} from '@project-serum/anchor';
import {Invite} from '../target/types/invite';
import {expect} from 'chai';
import {LAMPORTS_PER_SOL} from '@solana/web3.js';

const {SystemProgram} = anchor.web3;

describe('invite', async () => {

    const provider = anchor.getProvider();

    const program = anchor.workspace.Invite as Program<Invite>;
    const user = provider.wallet.publicKey;

    // Prepare test user.
    const testUser = anchor.web3.Keypair.generate();
    const airdropSig = await provider.connection.requestAirdrop(testUser.publicKey, 1 * LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction(airdropSig);

    const inviteSeed = [Buffer.from("invite"), testUser.publicKey.toBuffer()];
    const [inviteAccount, _] = await anchor.web3.PublicKey.findProgramAddress(inviteSeed, program.programId);

    describe("Invite", async () => {
        it("should initialize", async () => {
            await program.methods.initialize()
                .accounts({inviteAccount: inviteAccount, authority: testUser.publicKey, payer: user, systemProgram: SystemProgram.programId})
                .rpc();
            const data = await program.account.invite.fetch(inviteAccount);
            expect(data.authority.toString()).to.equal(testUser.publicKey.toString());
        });

        it("should send invite to others", async () => {
            const randomUser = anchor.web3.Keypair.generate();
            const toInviteSeed = [Buffer.from("invite"), randomUser.publicKey.toBuffer()];
            const [toInviteAccount, _] = await anchor.web3.PublicKey.findProgramAddress(toInviteSeed, program.programId);
            const tx = await program.methods.sendInvite()
                .accounts({inviteAccount: inviteAccount, toInviteAccount: toInviteAccount, to: randomUser.publicKey, authority: testUser.publicKey, systemProgram: SystemProgram.programId})
                .transaction();
            tx.feePayer = user;
            tx.recentBlockhash = (await provider.connection.getRecentBlockhash()).blockhash;
            tx.sign(testUser);
            await provider.sendAndConfirm(tx)
            const data = await program.account.invite.fetch(inviteAccount);
            expect(data.referred[0].toString()).to.equal(randomUser.publicKey.toString());
            const invited_data = await program.account.invite.fetch(toInviteAccount);
            expect(invited_data.authority.toString()).to.equal(randomUser.publicKey.toString());
        });
    });
});
