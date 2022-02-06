import * as anchor from '@project-serum/anchor';
import {Program} from '@project-serum/anchor';
import {Wordcel} from '../target/types/wordcel';
import {expect} from 'chai';

const {SystemProgram} = anchor.web3;

describe('wordcel', async () => {

    // Configure the client to use the local cluster.
    const provider = anchor.Provider.env()
    anchor.setProvider(provider);

    const program = anchor.workspace.Wordcel as Program<Wordcel>;
    const user = provider.wallet;
    // const user = anchor.web3.Keypair.generate();
    const publicationSeeds = [Buffer.from("publication"), user.publicKey.toBuffer()];
    const [publicationAccount, publicationBump] = await anchor.web3.PublicKey.findProgramAddress(publicationSeeds, program.programId);
    let oneTrueFan;

    it("should initialize", async () => {
        await program.rpc.initialize(publicationBump, {
            accounts: {
                publication: publicationAccount,
                user: provider.wallet.publicKey,
                systemProgram: SystemProgram.programId,
            }
        });
        const account = await program.account.publication.fetch(publicationAccount);
        expect(account.postNonce).to.equal(0);
    });

    it("should create a new post", async () => {
        const postSeeds = [Buffer.from("post"), publicationAccount.toBuffer(), new anchor.BN(0).toArrayLike(Buffer)];
        const [postAccount, postBump] = await anchor.web3.PublicKey.findProgramAddress(postSeeds, program.programId);
        const metadataUri = "https://gist.githubusercontent.com/abishekk92/10593977/raw/589238c3d48e654347d6cbc1e29c1e10dadc7cea/monoid.md";
        await program.rpc.createPost(postBump, metadataUri, {
            accounts: {
                post: postAccount,
                publication: publicationAccount,
                authority: provider.wallet.publicKey,
                systemProgram: SystemProgram.programId,
            }
        });
        const publication = await program.account.publication.fetch(publicationAccount);
        expect(publication.postNonce).to.equal(1);
        const post = await program.account.post.fetch(postAccount);
        expect(post.metadataUri).to.equal(metadataUri);
    });

    it("should update post", async () => {
        const postSeeds = [Buffer.from("post"), publicationAccount.toBuffer(), new anchor.BN(0).toArrayLike(Buffer)];
        const [postAccount, _] = await anchor.web3.PublicKey.findProgramAddress(postSeeds, program.programId);
        const metadataUri = "https://gist.githubusercontent.com/shekdev/10593977/raw/589238c3d48e654347d6cbc1e29c1e10dadc7cea/monoid.md";
        await program.rpc.updatePost(metadataUri, {
            accounts: {
                post: postAccount,
                publication: publicationAccount,
                authority: provider.wallet.publicKey,
                systemProgram: SystemProgram.programId,
            }
        });
        const post = await program.account.post.fetch(postAccount);
        expect(post.metadataUri).to.equal(metadataUri);
    });

    it("should pick up the next postNonce", async () => {
        const postSeeds = [Buffer.from("post"), publicationAccount.toBuffer(), new anchor.BN(1).toArrayLike(Buffer)];
        const [postAccount, postBump] = await anchor.web3.PublicKey.findProgramAddress(postSeeds, program.programId);
        const metadataUri = "https://gist.githubusercontent.com/shekdev/10593977/raw/589238c3d48e654347d6cbc1e29c1e10dadc7cea/monoid.md";
        await program.rpc.createPost(postBump, metadataUri, {
            accounts: {
                post: postAccount,
                publication: publicationAccount,
                authority: provider.wallet.publicKey,
                systemProgram: SystemProgram.programId,
            }
        });
        const publication = await program.account.publication.fetch(publicationAccount);
        expect(publication.postNonce).to.equal(2);
    });

    it("should get all accounts up to the current postNonce", async () => {
        const publication = await program.account.publication.fetch(publicationAccount);
        let posts = []
        for (let index = 0; index < publication.postNonce; index++) {
            const postSeeds = [Buffer.from("post"), publicationAccount.toBuffer(), new anchor.BN(publication[index]).toArrayLike(Buffer)];
            const [postAccount, _] = await anchor.web3.PublicKey.findProgramAddress(postSeeds, program.programId);
            const post = await program.account.post.fetch(postAccount);
            posts.push(post);
        }
        expect(publication.postNonce).to.equal(posts.length);
    });

    it("should create a subscriber", async () => {
        const subscriberSeeds = [Buffer.from("subscriber"), user.publicKey.toBuffer()];
        const [subscriberAccount, subscriberBump] = await anchor.web3.PublicKey.findProgramAddress(subscriberSeeds, program.programId);
        await program.rpc.initializeSubscriber(subscriberBump, {
            accounts: {
                subscriber: subscriberAccount,
                user: provider.wallet.publicKey,
                systemProgram: SystemProgram.programId
            }
        });
        const subscriber = await program.account.subscriber.fetch(subscriberAccount);
        expect(subscriber.subscriptionNonce).to.equal(0)
        oneTrueFan = subscriberAccount;
    });

    it("should create a subscription for a subscriber", async () => {
        expect(oneTrueFan).to.not.equal(undefined);
        const oneTrueFanData = await program.account.subscriber.fetch(oneTrueFan);
        const subscriptionSeeds = [Buffer.from("subscription"), oneTrueFan.toBuffer(), new anchor.BN(oneTrueFanData.subscriptionNonce).toArrayLike(Buffer)];
        const [subscriptionAccount, subscriptionBump] = await anchor.web3.PublicKey.findProgramAddress(subscriptionSeeds, program.programId);
        await program.rpc.initializeSubscription(subscriptionBump, {
            accounts: {
                subscription: subscriptionAccount,
                subscriber: oneTrueFan,
                publication: publicationAccount,
                authority: provider.wallet.publicKey,
                systemProgram: SystemProgram.programId
            }
        });
        const subscription = await program.account.subscription.fetch(subscriptionAccount);
        expect(subscription.publication.toString()).to.equal(publicationAccount.toString());
        const subscriber = await program.account.subscriber.fetch(oneTrueFan);
        expect(subscriber.subscriptionNonce).to.equal(1)
    });

    it("should only allow the subscriber to unsubscribe", async () => {
        expect(oneTrueFan).to.not.equal(undefined);
        const oneTrueFanData = await program.account.subscriber.fetch(oneTrueFan);
        const subscriptionSeeds = [Buffer.from("subscription"), oneTrueFan.toBuffer(), new anchor.BN(oneTrueFanData.subscriptionNonce).toArrayLike(Buffer)];
        const [subscriptionAccount, subscriptionBump] = await anchor.web3.PublicKey.findProgramAddress(subscriptionSeeds, program.programId);
        await program.rpc.initializeSubscription(subscriptionBump, {
            accounts: {
                subscription: subscriptionAccount,
                subscriber: oneTrueFan,
                publication: publicationAccount,
                authority: provider.wallet.publicKey,
                systemProgram: SystemProgram.programId
            }
        });
        await program.rpc.cancelSubscription({
            accounts: {
                subscription: subscriptionAccount,
                subscriber: oneTrueFan,
                authority: provider.wallet.publicKey,
                systemProgram: SystemProgram.programId
            }
        });
        try {
            await program.account.subscription.fetch(subscriptionAccount);
        } catch (error) {
            expect(error).to.be.an('error');
        }
    });

    it("should not allow unauthorized unsubscription", async () => {
        expect(oneTrueFan).to.not.equal(undefined);
        const oneTrueFanData = await program.account.subscriber.fetch(oneTrueFan);
        const subscriptionSeeds = [Buffer.from("subscription"), oneTrueFan.toBuffer(), new anchor.BN(oneTrueFanData.subscriptionNonce).toArrayLike(Buffer)];
        const [subscriptionAccount, subscriptionBump] = await anchor.web3.PublicKey.findProgramAddress(subscriptionSeeds, program.programId);
        await program.rpc.initializeSubscription(subscriptionBump, {
            accounts: {
                subscription: subscriptionAccount,
                subscriber: oneTrueFan,
                publication: publicationAccount,
                authority: provider.wallet.publicKey,
                systemProgram: SystemProgram.programId
            }
        });
        const randomUser = anchor.web3.Keypair.generate();
        try {
            await program.rpc.cancelSubscription({
                accounts: {
                    subscription: subscriptionAccount,
                    subscriber: oneTrueFan,
                    authority: randomUser.publicKey,
                    systemProgram: SystemProgram.programId
                }
            });
        } catch (error) {
            expect(error).to.be.an('error');
        }
    });
});
