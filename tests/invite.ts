import * as anchor from '@project-serum/anchor';
import {Program} from '@project-serum/anchor';
import {Invite} from '../target/types/invite';
import {expect} from 'chai';
import {LAMPORTS_PER_SOL, PublicKey} from '@solana/web3.js';

const {SystemProgram} = anchor.web3;

describe('invite', async () => {
    const provider = anchor.getProvider();

    const program = anchor.workspace.Invite as Program<Invite>;
    const user = provider.wallet.publicKey;

    // Prepare test user.
    const testUser = anchor.web3.Keypair.generate();
    const inviteSeed = [Buffer.from("invite"), testUser.publicKey.toBuffer()];
    let oneInviteAccount: PublicKey;

    before(async () => {
        const airdropSig = await provider.connection.requestAirdrop(testUser.publicKey, 1 * LAMPORTS_PER_SOL);
        await provider.connection.confirmTransaction(airdropSig);
        const [inviteAccount, _] = await anchor.web3.PublicKey.findProgramAddress(inviteSeed, program.programId);
        oneInviteAccount = inviteAccount;
    });


    it("should initialize", async () => {

        await program.methods.initialize()
            .accounts({inviteAccount: oneInviteAccount, authority: testUser.publicKey, payer: user, systemProgram: SystemProgram.programId})
            .rpc();
        const data = await program.account.invite.fetch(oneInviteAccount);
        expect(data.authority.toString()).to.equal(testUser.publicKey.toString());
    });

    it("should send invite to others", async () => {
        const randomUser = anchor.web3.Keypair.generate();
        const toInviteSeed = [Buffer.from("invite"), randomUser.publicKey.toBuffer()];
        const [toInviteAccount, _] = await anchor.web3.PublicKey.findProgramAddress(toInviteSeed, program.programId);
        const tx = await program.methods.sendInvite()
            .accounts({inviteAccount: oneInviteAccount, toInviteAccount: toInviteAccount, to: randomUser.publicKey, authority: testUser.publicKey, systemProgram: SystemProgram.programId})
            .transaction();
        tx.feePayer = user;
        tx.recentBlockhash = (await provider.connection.getRecentBlockhash()).blockhash;
        tx.sign(testUser);
        await provider.sendAndConfirm(tx)
        const data = await program.account.invite.fetch(oneInviteAccount);
        expect(data.referred[0].toString()).to.equal(randomUser.publicKey.toString());
        const toInviteData = await program.account.invite.fetch(toInviteAccount);
        expect(toInviteData.authority.toString()).to.equal(randomUser.publicKey.toString());
    });


    it("should not allow random user to initialize", async () => {
        const randomUser = anchor.web3.Keypair.generate();
        const seed = [Buffer.from("invite"), randomUser.publicKey.toBuffer()];
        const [account, _] = await anchor.web3.PublicKey.findProgramAddress(seed, program.programId);
        const tx = await program.methods.initialize()
            .accounts({inviteAccount: account, authority: randomUser.publicKey, payer: testUser.publicKey, systemProgram: SystemProgram.programId})
            .transaction();
        tx.feePayer = user;
        tx.recentBlockhash = (await provider.connection.getRecentBlockhash()).blockhash;
        tx.sign(testUser);
        try {
            await provider.sendAndConfirm(tx)
        } catch (error) {
            expect(error.toString()).to.contain('custom program error: 0x7dc');
        }
    });

    it("should allow admin to initialize as many accounts as required", async () => {
        for (let index = 0; index < 5; index++) {
            const randomUser = anchor.web3.Keypair.generate();
            const seed = [Buffer.from("invite"), randomUser.publicKey.toBuffer()];
            const [account, _] = await anchor.web3.PublicKey.findProgramAddress(seed, program.programId);
            await program.methods.initialize()
                .accounts({inviteAccount: account, authority: randomUser.publicKey, payer: user, systemProgram: SystemProgram.programId})
                .rpc();
            const data = await program.account.invite.fetch(account);
            expect(data.authority.toString()).to.equal(randomUser.publicKey.toString());
        }
    });

    it("should not allow uninitialized invite account to send an invite", async () => {
        const randomUser = anchor.web3.Keypair.generate();
        const toInviteSeed = [Buffer.from("invite"), randomUser.publicKey.toBuffer()];
        const [toInviteAccount, _1] = await anchor.web3.PublicKey.findProgramAddress(toInviteSeed, program.programId);
        const randomUser1 = anchor.web3.Keypair.generate();
        const inviteSeed = [Buffer.from("invite"), randomUser1.publicKey.toBuffer()];
        const airdropSig = await provider.connection.requestAirdrop(randomUser1.publicKey, 1 * LAMPORTS_PER_SOL);
        await provider.connection.confirmTransaction(airdropSig);
        const [inviteAccount, _2] = await anchor.web3.PublicKey.findProgramAddress(inviteSeed, program.programId);
        const tx = await program.methods.sendInvite()
            .accounts({inviteAccount: inviteAccount, toInviteAccount: toInviteAccount, to: randomUser.publicKey, authority: randomUser1.publicKey, systemProgram: SystemProgram.programId})
            .transaction();
        tx.feePayer = user;
        tx.recentBlockhash = (await provider.connection.getRecentBlockhash()).blockhash;
        tx.sign(randomUser1);
        try {
            await provider.sendAndConfirm(tx)

        } catch (error) {
            expect(error.toString()).to.contain('custom program error: 0xbc4');
        }
    });
});
