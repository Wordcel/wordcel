import {Command} from "commander";
import {PathLike, readFileSync} from 'fs';
import Arweave from 'arweave';
import * as anchor from '@project-serum/anchor';
import idl from "../target/idl/wordcel.json";

const {SystemProgram} = anchor.web3;
const provider = anchor.Provider.env();
anchor.setProvider(provider);
const user = provider.wallet;

const publicationSeeds = [Buffer.from("publication"), user.publicKey.toBuffer()];

const programID = new anchor.web3.PublicKey(idl.metadata.address);
const program = new anchor.Program(idl as anchor.Idl, programID, provider);

async function createPublication() {
    const [publicationAccount, publicationBump] = await anchor.web3.PublicKey.findProgramAddress(publicationSeeds, program.programId);
    await program.rpc.initialize(publicationBump, {
        accounts: {
            publication: publicationAccount,
            user: user.publicKey,
            systemProgram: SystemProgram.programId,
        }
    });
    return publicationAccount;
}

async function createPost(publication: String, file: PathLike) {
    const publicationKey = new anchor.web3.PublicKey(publication);
    const publicationAccount = await program.account.publication.fetch(publicationKey);
    const postSeeds = [Buffer.from("post"), publicationKey.toBuffer(), new anchor.BN(publicationAccount.postNonce).toArrayLike(Buffer)];
    const [postAccount, postBump] = await anchor.web3.PublicKey.findProgramAddress(postSeeds, program.programId);
    const to_json = !file.toString().endsWith(".json");
    const metadataUri = await uploadArweave(file, to_json)
    await program.rpc.createPost(postBump, metadataUri, {
        accounts: {
            post: postAccount,
            publication: publicationKey,
            authority: provider.wallet.publicKey,
            systemProgram: SystemProgram.programId,
        }
    });
    console.log(`Created post. Visit http://wordcel.local:3000/post/${postAccount}`);
    return postAccount;
}

async function updatePost(publication: String, post: String, file: PathLike) {
    const to_json = !file.toString().endsWith(".json");
    const metadataUri = await uploadArweave(file, to_json)
    const postKey = new anchor.web3.PublicKey(post);
    const publicationKey = new anchor.web3.PublicKey(publication);
    await program.rpc.updatePost(metadataUri, {
        accounts: {
            post: postKey,
            publication: publicationKey,
            authority: provider.wallet.publicKey,
            systemProgram: SystemProgram.programId,
        }
    });
}

async function uploadArweave(dataFile: PathLike, to_json: boolean = true) {
    let data = readFileSync(dataFile, 'utf8');
    if (to_json) {
        let regex = /---\n(.*)\n---/i;
        const results = data.match(regex);
        const title = results[1].split(":")[1].trim();
        data = JSON.stringify({
            "title": title, "content": data.replace(regex, ""), "type": "markdown"
        });
    }
    const arweave = Arweave.init({
        host: 'arweave.net',
        port: 443,
        protocol: 'https'
    });
    let key = await arweave.wallets.generate();
    let transaction = await arweave.createTransaction({"data": data}, key);
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

const cli = new Command();

cli
    .name('wordcel-cli')
    .description('Command line client to the wordcel protocol')
    .version('0.1.0');

cli
    .command('new_pub')
    .action(function () {
        createPublication()
    });

cli
    .command('new_post')
    .option('-pu, --publication <string>', 'publication to post into')
    .option('-f, --file <string>', 'publication to post into')
    .action(async function (options) {
        await createPost(options.publication, options.file);
    });

cli
    .command('update_post')
    .option('-po, --post <string>', 'post to update')
    .option('-pu, --publication <string>', 'post to update')
    .option('-f, --file <path>', 'publication to post into')
    .action(async function (options) {
        await updatePost(options.publication, options.post, options.file)
        console.log("Post updated");
    });

cli.parse(process.argv);
