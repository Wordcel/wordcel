import * as anchor from '@project-serum/anchor';
import {Program} from '@project-serum/anchor';
import {Invite} from '../target/types/invite';
import {expect} from 'chai';
import {PublicKey} from '@solana/web3.js';
import {getInviteAccount, sendInvite} from "./utils/invite";
import {airdrop} from './utils';

const {SystemProgram} = anchor.web3;
const provider = anchor.getProvider();

const program = anchor.workspace.Invite as Program<Invite>;
const user = provider.wallet.publicKey;


describe('Invitation', async () => {
    // Prepare test user.
    const testUser = anchor.web3.Keypair.generate();
    let oneInviteAccount: PublicKey;

    before(async () => {
        await airdrop(testUser.publicKey);
        oneInviteAccount = await getInviteAccount(testUser.publicKey);
    });


    it("should initialize", async () => {

        await program.methods.initialize()
            .accounts({
                inviteAccount: oneInviteAccount,
                authority: testUser.publicKey,
                payer: user,
                systemProgram: SystemProgram.programId
            })
            .rpc();
        const data = await program.account.invite.fetch(oneInviteAccount);
        expect(data.authority.toString()).to.equal(testUser.publicKey.toString());
    });

    it("should send invite to others", async () => {
        const randomUser = anchor.web3.Keypair.generate();
        const [inviter, invited] = await sendInvite(testUser, randomUser.publicKey, user)
        const data = await program.account.invite.fetch(inviter);
        expect(data.referred[0].toString()).to.equal(randomUser.publicKey.toString());
        const toInviteData = await program.account.invite.fetch(invited);
        expect(toInviteData.authority.toString()).to.equal(randomUser.publicKey.toString());
    });

    it("should not be able to send more than 2 invites", async () => {
        // Set up new user
        const newUser = anchor.web3.Keypair.generate();
        await airdrop(newUser.publicKey);
        const inviteAccount = await getInviteAccount(newUser.publicKey);
        await program.methods.initialize()
            .accounts({
                inviteAccount: inviteAccount,
                authority: newUser.publicKey,
                payer: user,
                systemProgram: SystemProgram.programId
            })
            .rpc();

        //First Invite
        const randomUser = anchor.web3.Keypair.generate();
        await sendInvite(newUser, randomUser.publicKey, user);

        //Second Invite
        const randomUser1 = anchor.web3.Keypair.generate();
        await sendInvite(newUser, randomUser1.publicKey, user);

        // Third Invite
        const randomUser2 = anchor.web3.Keypair.generate();
        try {
            await sendInvite(newUser, randomUser2.publicKey, user);
        } catch (error) {
            expect(error.toString()).to.contain('custom program error: 0xbbc');
        }
    });


    it("should not allow random user to initialize", async () => {
        const randomUser = anchor.web3.Keypair.generate();
        const seed = [Buffer.from("invite"), randomUser.publicKey.toBuffer()];
        const [account, _] = await anchor.web3.PublicKey.findProgramAddress(seed, program.programId);
        const tx = await program.methods.initialize()
            .accounts({
                inviteAccount: account,
                authority: randomUser.publicKey,
                payer: testUser.publicKey,
                systemProgram: SystemProgram.programId
            })
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
                .accounts({
                    inviteAccount: account,
                    authority: randomUser.publicKey,
                    payer: user,
                    systemProgram: SystemProgram.programId
                })
                .rpc();
            const data = await program.account.invite.fetch(account);
            expect(data.authority.toString()).to.equal(randomUser.publicKey.toString());
        }
    });

    it("should not allow uninitialized invite account to send an invite", async () => {
        const randomUser = anchor.web3.Keypair.generate();
        const randomUser1 = anchor.web3.Keypair.generate();
        await airdrop(randomUser1.publicKey);
        try {
            await sendInvite(randomUser, randomUser1.publicKey, user)
        } catch (error) {
            expect(error.toString()).to.contain('custom program error: 0xbc4');
        }
    });
});
