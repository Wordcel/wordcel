import * as anchor from '@project-serum/anchor';
import {Program} from '@project-serum/anchor';
import {Wordcel} from '../target/types/wordcel';
import {expect} from 'chai';
import {PublicKey, LAMPORTS_PER_SOL} from '@solana/web3.js';
import randombytes from 'randombytes';

const {SystemProgram} = anchor.web3;
const provider = anchor.getProvider();

const program = anchor.workspace.Wordcel as Program<Wordcel>;
const user = provider.wallet.publicKey;

async function airdrop(key: PublicKey) {
    const airdropSig = await provider.connection.requestAirdrop(key, 1 * LAMPORTS_PER_SOL);
    return provider.connection.confirmTransaction(airdropSig);
}

describe('wordcel', async () => {

    const randomHash = randombytes(32);
    const profileSeed = [Buffer.from("profile"), randomHash];
    const [profileAccount, _] = await anchor.web3.PublicKey.findProgramAddress(profileSeed, program.programId);
    let oneTrueFan: PublicKey;
    let onePostAccount: PublicKey;

    describe("Profile", async () => {
        it("should initialize", async () => {
            await program.methods.initialize(randomHash)
                .accounts({profile: profileAccount, user: user, systemProgram: SystemProgram.programId})
                .rpc();
            const data = await program.account.profile.fetch(profileAccount);
            expect(data.authority.toString()).to.equal(user.toString());
        });
    });

    describe("Post", async () => {
        it("should create a new post", async () => {
            const randomHash = randombytes(32);
            const postSeeds = [Buffer.from("post"), randomHash];
            const [postAccount, _] = await anchor.web3.PublicKey.findProgramAddress(postSeeds, program.programId);
            const metadataUri = "https://gist.githubusercontent.com/abishekk92/10593977/raw/589238c3d48e654347d6cbc1e29c1e10dadc7cea/monoid.md";
            await program.methods.createPost(metadataUri, randomHash).accounts({
                post: postAccount,
                profile: profileAccount,
                authority: user,
                systemProgram: SystemProgram.programId,
            }).rpc();
            const post = await program.account.post.fetch(postAccount);
            expect(post.metadataUri).to.equal(metadataUri);
            onePostAccount = postAccount;
        });

        it("should update post", async () => {
            const metadataUri = "https://gist.githubusercontent.com/shekdev/10593977/raw/589238c3d48e654347d6cbc1e29c1e10dadc7cea/monoid.md";
            await program.methods.updatePost(metadataUri).accounts({
                post: onePostAccount,
                profile: profileAccount,
                authority: user,
                systemProgram: SystemProgram.programId,
            }).rpc();
            const post = await program.account.post.fetch(onePostAccount);
            expect(post.metadataUri).to.equal(metadataUri);
        });

        it("should only allow the post to be edited with the original profile", async () => {
            const randomHash = randombytes(32);
            const profileSeed = [Buffer.from("profile"), randomHash];
            const [newProfileAccount, _] = await anchor.web3.PublicKey.findProgramAddress(profileSeed, program.programId);
            await program.methods.initialize(randomHash)
                .accounts({
                    profile: newProfileAccount,
                    user: user,
                    systemProgram: SystemProgram.programId
                })
                .rpc();
            const metadataUri = "https://gist.githubusercontent.com/shekdev/10593977/raw/589238c3d48e654347d6cbc1e29c1e10dadc7cea/monoid.md";
            try {
                await program.methods.updatePost(metadataUri).accounts({
                    post: onePostAccount,
                    profile: newProfileAccount,
                    authority: user,
                    systemProgram: SystemProgram.programId,
                }).rpc();

            } catch (error) {
                expect(error).to.be.an('error');
                expect(error.toString()).to.contain('Error Code: ConstraintHasOne');
            }
        });

        it("should create a post as a comment", async () => {
            const randomHash = randombytes(32);
            const postSeeds = [Buffer.from("post"), randomHash, onePostAccount.toBuffer()];
            const [postAccount, _] = await anchor.web3.PublicKey.findProgramAddress(postSeeds, program.programId);
            const metadataUri = "https://gist.githubusercontent.com/abishekk92/10593977/raw/589238c3d48e654347d6cbc1e29c1e10dadc7cea/monoid.md";
            await program.methods.comment(metadataUri, randomHash).accounts({
                post: postAccount,
                profile: profileAccount,
                replyTo: onePostAccount,
                authority: user,
                systemProgram: SystemProgram.programId,
            }).rpc();
            const post = await program.account.post.fetch(postAccount);
            expect(post.metadataUri).to.equal(metadataUri);
            onePostAccount = postAccount;
        });
    });


    describe("Connection", async () => {
        let randomUser: Keypair;
        let connectionAccount: PublicKey;

        before(async () => {
            randomUser = anchor.web3.Keypair.generate();
            await airdrop(randomUser.publicKey);
            const connectionSeeds = [Buffer.from("connection"), randomUser.publicKey.toBuffer(), profileAccount.toBuffer()];
            const [account, _] = await anchor.web3.PublicKey.findProgramAddress(connectionSeeds, program.programId);
            connectionAccount = account;
        });

        it("should create a connection", async () => {
            const tx = await program.methods.initializeConnection().accounts({
                connection: connectionAccount,
                profile: profileAccount,
                authority: randomUser.publicKey,
                systemProgram: SystemProgram.programId
            }).transaction();
            tx.feePayer = user;
            tx.recentBlockhash = (await provider.connection.getRecentBlockhash()).blockhash;
            tx.sign(randomUser);
            await provider.sendAndConfirm(tx);
            const connection = await program.account.connection.fetch(connectionAccount);
            expect(connection.profile.toString()).to.equal(profileAccount.toString());
        });

        describe("Close Connection", () => {
            // Test must be run synchronously and in the specified order to avoid attepting to close an account that doesn't exist.
            it("should not allow unauthorized closing of connection", async () => {
                const closeUser = anchor.web3.Keypair.generate();
                const tx = await program.methods.closeConnection().accounts({
                    connection: connectionAccount,
                    profile: profileAccount,
                    authority: closeUser.publicKey,
                    systemProgram: SystemProgram.programId
                }).transaction();
                tx.feePayer = user;
                tx.recentBlockhash = (await provider.connection.getRecentBlockhash()).blockhash;
                tx.sign(closeUser);
                try {
                    await provider.sendAndConfirm(tx);
                } catch (error) {
                    expect(error).to.be.an('error');
                    expect(error.toString()).to.contain('custom program error: 0x7d6');
                }
            });

            it("should only allow the user to close the connection", async () => {
                const tx = await program.methods.closeConnection().accounts({
                    connection: connectionAccount,
                    profile: profileAccount,
                    authority: randomUser.publicKey,
                    systemProgram: SystemProgram.programId
                }).transaction();
                tx.feePayer = user;
                tx.recentBlockhash = (await provider.connection.getRecentBlockhash()).blockhash;
                tx.sign(randomUser);
                await provider.sendAndConfirm(tx);
                try {
                    await program.account.connection.fetch(connectionAccount);
                } catch (error) {
                    expect(error).to.be.an('error');
                    expect(error.toString()).to.contain('Error: Account does not exist');
                }
            });
        });

    });
});
