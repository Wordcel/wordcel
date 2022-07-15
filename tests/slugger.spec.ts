import * as anchor from '@project-serum/anchor';
import {Program, AnchorError} from '@project-serum/anchor';
import {Wordcel} from '../target/types/wordcel';
import {Slugger} from '../target/types/slugger';
import {expect} from 'chai';
import {PublicKey} from '@solana/web3.js';
import {getInviteAccount, invitationProgram} from "./utils/invite";
import {airdrop} from './utils';
import randombytes from 'randombytes';
import {createHash} from 'crypto';

const {SystemProgram} = anchor.web3;
const provider = anchor.getProvider();

const wordcelProgram = anchor.workspace.Wordcel as Program<Wordcel>;
const sluggerProgram = anchor.workspace.Slugger as Program<Slugger>;


const user = provider.wallet.publicKey;


function getSlugHash(slug) {
    return createHash('sha256').update(slug, 'utf8').digest();
}
async function getSlugAccount(slugHash, profileAccount: PublicKey) {
    const seeds = [Buffer.from("slug"), profileAccount.toBuffer(), slugHash];
    const [account, _] = await anchor.web3.PublicKey.findProgramAddress(seeds, sluggerProgram.programId);
    return account
}

describe('Slugger', async () => {

    let inviteAccount: PublicKey;
    let profileAccount: PublicKey;
    let postAccount: PublicKey;

    // Prepare test user.
    before(async () => {
        await airdrop(user);
        inviteAccount = await getInviteAccount(user);
        // Initialize invite
        await invitationProgram.methods.initialize()
            .accounts({
                inviteAccount: inviteAccount,
                authority: user,
                payer: user,
                systemProgram: SystemProgram.programId
            }).rpc();

        // Set up a profile
        const profileHash = randombytes(32);
        const profileSeed = [Buffer.from("profile"), profileHash];
        const [_profileAccount, _profileBump] = await anchor.web3.PublicKey.findProgramAddress(profileSeed, wordcelProgram.programId);
        profileAccount = _profileAccount;
        await wordcelProgram.methods.initialize(profileHash)
            .accounts({
                profile: profileAccount,
                user: user,
                invitation: inviteAccount,
                invitationProgram: invitationProgram.programId,
                systemProgram: SystemProgram.programId
            }).rpc();

        // Set up a post
        const postHash = randombytes(32);
        const postSeeds = [Buffer.from("post"), postHash];
        const [_postAccount, _postBump] = await anchor.web3.PublicKey.findProgramAddress(postSeeds, wordcelProgram.programId);
        postAccount = _postAccount;
        const metadataUri = "https://gist.githubusercontent.com/abishekk92/10593977/raw/589238c3d48e654347d6cbc1e29c1e10dadc7cea/monoid.md";
        await wordcelProgram.methods.createPost(metadataUri, postHash).accounts({
            post: postAccount,
            profile: profileAccount,
            authority: user,
            systemProgram: SystemProgram.programId,
        }).rpc();
    });


    it("should initialize", async () => {
        let slugHash = getSlugHash("gm-wagmi");
        let slugAccount = await getSlugAccount(slugHash, profileAccount);
        await sluggerProgram.methods.initialize(slugHash)
            .accounts({
                slug: slugAccount,
                profile: profileAccount,
                post: postAccount,
                authority: user,
                wordcelProgram: wordcelProgram.programId,
                systemProgram: SystemProgram.programId
            })
            .rpc();
        const data = await sluggerProgram.account.slug.fetch(slugAccount);
        expect(data.authority.toString()).to.equal(user.toString());
        expect(data.post.toString()).to.equal(postAccount.toString());
    });
});
