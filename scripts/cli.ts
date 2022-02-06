// import {Command} from "commander";


// const cli = new Command();

// cli.option('-p --post', 'Post')

// const options = cli.parse(process.argv);
// console.log(options);

import * as anchor from '@project-serum/anchor';
import {Program} from '@project-serum/anchor';
import {Wordcel} from '../target/types/wordcel';
import fetch from 'node-fetch';
import Bundlr from '@bundlr-network/client';
import {readFileSync} from 'fs';
import Arweave from 'arweave';


const {SystemProgram} = anchor.web3;
const provider = anchor.Provider.env()
anchor.setProvider(provider);

const program = anchor.workspace.Wordcel as Program<Wordcel>;
const user = provider.wallet;

// const user = anchor.web3.Keypair.generate();
const publicationSeeds = [Buffer.from("publication"), user.publicKey.toBuffer()];
// const [publicationAccount, publicationBump] = await anchor.web3.PublicKey.findProgramAddress(publicationSeeds, program.programId);

// console.log(publicationAccount);
async function uploadArweave(dataFile) {
    const data = readFileSync(dataFile, 'utf8');
    // const arweave = Arweave.init({});
    const arweave = Arweave.init({
        host: 'arweave.net',
        port: 443,
        protocol: 'https'
    });
    let key = await arweave.wallets.generate();
    let transaction = await arweave.createTransaction({data: data}, key);
    transaction.addTag('Content-Type', 'application/json');
    await arweave.transactions.sign(transaction, key);
    const {id} = transaction;

    let uploader = await arweave.transactions.getUploader(transaction);

    while (!uploader.isComplete) {
        await uploader.uploadChunk();
        console.log(`${uploader.pctComplete}% complete, ${uploader.uploadedChunks}/${uploader.totalChunks}`);
    }

    return `https://arweave.net/${id}`

}

async function createPublication(publicationAccount, publicationBump) {
    await program.rpc.initialize(publicationBump, {
        accounts: {
            publication: publicationAccount,
            user: provider.wallet.publicKey,
            systemProgram: SystemProgram.programId,
        }
    });
    return publicationAccount;
}

async function createPost(publicationAccount, nonce, postFile) {
    console.log("Creating post");
    const postSeeds = [Buffer.from("post"), publicationAccount.toBuffer(), new anchor.BN(nonce).toArrayLike(Buffer)];
    const [postAccount, postBump] = await anchor.web3.PublicKey.findProgramAddress(postSeeds, program.programId);
    const metadataUri = await uploadArweave(postFile);
    console.log(metadataUri);
    await program.rpc.createPost(postBump, metadataUri, {
        accounts: {
            post: postAccount,
            publication: publicationAccount,
            authority: provider.wallet.publicKey,
            systemProgram: SystemProgram.programId,
        }
    });
    return postAccount;
};

async function updatePost() {
    console.log("Updating post");
};

async function getPosts(publicationAccount) {
    const publication = await program.account.publication.fetch(publicationAccount);
    let posts = [];
    for (let index = 0; index < publication.postNonce; index++) {
        const postSeeds = [Buffer.from("post"), publicationAccount.toBuffer(), new anchor.BN(publication[index]).toArrayLike(Buffer)];
        const [postAccount, _] = await anchor.web3.PublicKey.findProgramAddress(postSeeds, program.programId);
        const post = await program.account.post.fetch(postAccount);
        posts.push(post);
    }
    return posts;
}

(async () => {
    const [publicationAccount, publicationBump] = await anchor.web3.PublicKey.findProgramAddress(publicationSeeds, program.programId);
    await createPublication(publicationAccount, publicationBump);
    const publication = await program.account.publication.fetch(publicationAccount);

    // const posts = await getPosts(publicationAccount);
    // console.log(posts);

    const metadataUri = 'data/gm.json';
    const postAccount = await createPost(publicationAccount, publication.postNonce, metadataUri);
    console.log(postAccount.toString());
    // await updatePost();
})();
