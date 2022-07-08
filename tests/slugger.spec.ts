import * as anchor from '@project-serum/anchor';
import {Program, AnchorError} from '@project-serum/anchor';
import {Slugger} from '../target/types/slugger';
import {expect} from 'chai';
import {PublicKey} from '@solana/web3.js';
import {getInviteAccount} from "./utils/invite";
import {airdrop} from './utils';

const {SystemProgram} = anchor.web3;
const provider = anchor.getProvider();

const program = anchor.workspace.Invite as Program<Invite>;
const user = provider.wallet.publicKey;


describe('Slugger', async () => {

    // Prepare test user.
    const testUser = anchor.web3.Keypair.generate();
    let oneInviteAccount: PublicKey;

    before(async () => {
        await airdrop(testUser.publicKey);
        oneInviteAccount = await getInviteAccount(testUser.publicKey);
    });


    it("should initialize", async () => {
        console.log("Testing Slug")
        let slug = "foobar";
        // let slugHash = sha256(slug);
        // let slugAccount = getSlugAccount(slugHash, postAccount, testUser);
        // await program.methods.initialize(slugHash)
        //     .accounts({
        //         profile: profileAccount,
        //         post: profileAccount,
        //         authority: testUser.publicKey,
        //         payer: user,
        //         systemProgram: SystemProgram.programId
        //     })
        //     .rpc();
        // const data = await program.account.slug.fetch(slugAccount);
        // expect(data.authority.toString()).to.equal(testUser.publicKey.toString());
        // expect(data.post.toString()).to.equal(postAccount.toString());
    });

});
