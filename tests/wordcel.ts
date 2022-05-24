import * as anchor from '@project-serum/anchor';
import {Program} from '@project-serum/anchor';
import {Wordcel} from '../target/types/wordcel';
import {expect} from 'chai';
import {PublicKey} from '@solana/web3.js';
import randombytes from 'randombytes';

const {SystemProgram} = anchor.web3;

describe('wordcel', async () => {

    const provider = anchor.getProvider();

    const program = anchor.workspace.Wordcel as Program<Wordcel>;
    const user = provider.wallet.publicKey;
    const randomHash = randombytes(32);
    const publicationSeed = [Buffer.from("publication"), randomHash];
    const [publicationAccount, _] = await anchor.web3.PublicKey.findProgramAddress(publicationSeed, program.programId);
    let oneTrueFan: PublicKey;
    let onePostAccount: PublicKey;

    describe("Publication", async () => {
        it("should initialize", async () => {
            await program.methods.initialize(randomHash)
                .accounts({publication: publicationAccount, user: user, systemProgram: SystemProgram.programId})
                .rpc();
            const data = await program.account.publication.fetch(publicationAccount);
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
                publication: publicationAccount,
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
                publication: publicationAccount,
                authority: user,
                systemProgram: SystemProgram.programId,
            }).rpc();
            const post = await program.account.post.fetch(onePostAccount);
            expect(post.metadataUri).to.equal(metadataUri);
        });

        it("should only allow the post to be edited with the original publication", async () => {
            const randomHash = randombytes(32);
            const publicationSeed = [Buffer.from("publication"), randomHash];
            const [newPublicationAccount, _] = await anchor.web3.PublicKey.findProgramAddress(publicationSeed, program.programId);
            await program.methods.initialize(randomHash)
                .accounts({publication: newPublicationAccount, user: user, systemProgram: SystemProgram.programId})
                .rpc();
            const metadataUri = "https://gist.githubusercontent.com/shekdev/10593977/raw/589238c3d48e654347d6cbc1e29c1e10dadc7cea/monoid.md";
            try {
                await program.methods.updatePost(metadataUri).accounts({
                    post: onePostAccount,
                    publication: newPublicationAccount,
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
                publication: publicationAccount,
                replyTo: onePostAccount,
                authority: user,
                systemProgram: SystemProgram.programId,
            }).rpc();
            const post = await program.account.post.fetch(postAccount);
            expect(post.metadataUri).to.equal(metadataUri);
            onePostAccount = postAccount;
        });
    });


    describe("Subscriber", async () => {
        it("should create a subscriber", async () => {
            const subscriberSeeds = [Buffer.from("subscriber"), user.toBuffer()];
            const [subscriberAccount, _] = await anchor.web3.PublicKey.findProgramAddress(subscriberSeeds, program.programId);
            await program.methods.initializeSubscriber().accounts({
                subscriber: subscriberAccount,
                user: user,
                systemProgram: SystemProgram.programId
            }).rpc();
            const subscriber = await program.account.subscriber.fetch(subscriberAccount);
            expect(subscriber.subscriptionNonce).to.equal(0)
            oneTrueFan = subscriberAccount;
        });
    });

    describe("Subscription", async () => {
        it("should create a subscription for a subscriber", async () => {
            expect(oneTrueFan).to.not.equal(undefined);
            const oneTrueFanData = await program.account.subscriber.fetch(oneTrueFan);
            const subscriptionSeeds = [Buffer.from("subscription"), oneTrueFan.toBuffer(), new anchor.BN(oneTrueFanData.subscriptionNonce).toArrayLike(Buffer)];
            const [subscriptionAccount, _] = await anchor.web3.PublicKey.findProgramAddress(subscriptionSeeds, program.programId);
            await program.methods.initializeSubscription().accounts({
                subscription: subscriptionAccount,
                subscriber: oneTrueFan,
                publication: publicationAccount,
                authority: user,
                systemProgram: SystemProgram.programId
            }).rpc();
            const subscription = await program.account.subscription.fetch(subscriptionAccount);
            expect(subscription.publication.toString()).to.equal(publicationAccount.toString());
            const subscriber = await program.account.subscriber.fetch(oneTrueFan);
            expect(subscriber.subscriptionNonce).to.equal(1)
        });

        it("should only allow the subscriber to unsubscribe", async () => {
            expect(oneTrueFan).to.not.equal(undefined);
            const oneTrueFanData = await program.account.subscriber.fetch(oneTrueFan);
            const subscriptionSeeds = [Buffer.from("subscription"), oneTrueFan.toBuffer(), new anchor.BN(oneTrueFanData.subscriptionNonce).toArrayLike(Buffer)];
            const [subscriptionAccount, _] = await anchor.web3.PublicKey.findProgramAddress(subscriptionSeeds, program.programId);
            await program.methods.initializeSubscription().accounts({
                subscription: subscriptionAccount,
                subscriber: oneTrueFan,
                publication: publicationAccount,
                authority: user,
                systemProgram: SystemProgram.programId
            }).rpc();
            await program.methods.cancelSubscription().accounts({
                subscription: subscriptionAccount,
                subscriber: oneTrueFan,
                authority: user,
                systemProgram: SystemProgram.programId
            }).rpc();
            try {
                await program.account.subscription.fetch(subscriptionAccount);
            } catch (error) {
                expect(error).to.be.an('error');
                expect(error.toString()).to.contain('Error: Account does not exist');
            }
        });

        it("should not allow unauthorized unsubscription", async () => {
            expect(oneTrueFan).to.not.equal(undefined);
            const oneTrueFanData = await program.account.subscriber.fetch(oneTrueFan);
            const subscriptionSeeds = [Buffer.from("subscription"), oneTrueFan.toBuffer(), new anchor.BN(oneTrueFanData.subscriptionNonce).toArrayLike(Buffer)];
            const [subscriptionAccount, _] = await anchor.web3.PublicKey.findProgramAddress(subscriptionSeeds, program.programId);
            await program.methods.initializeSubscription().accounts({
                subscription: subscriptionAccount,
                subscriber: oneTrueFan,
                publication: publicationAccount,
                authority: user,
                systemProgram: SystemProgram.programId
            }).rpc();
            const randomUser = anchor.web3.Keypair.generate();
            try {
                await program.methods.cancelSubscription().accounts({
                    subscription: subscriptionAccount,
                    subscriber: oneTrueFan,
                    authority: randomUser.publicKey,
                    systemProgram: SystemProgram.programId
                }).rpc();
            } catch (error) {
                expect(error).to.be.an('error');
                expect(error.toString()).to.contain('Error: Signature verification failed');
            }
        });

    });
});
