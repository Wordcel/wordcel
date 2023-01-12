import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { Wordcel } from "../target/types/wordcel";
import { expect } from "chai";
import { PublicKey } from "@solana/web3.js";
import randombytes from "randombytes";
import { airdrop, setupProfile } from "./utils";
const { SystemProgram } = anchor.web3;
const provider = anchor.getProvider();

const program = anchor.workspace.Wordcel as Program<Wordcel>;

describe("Editor", async () => {
  const host = anchor.web3.Keypair.generate();
  const host_anchor_wallet = new anchor.Wallet(host);
  const editor = anchor.web3.Keypair.generate();
  const editor_anchor_wallet = new anchor.Wallet(editor);

  let hostProfileAccount: PublicKey;
  let editorProfileAccount: PublicKey;
  let editorAccount: PublicKey;
  let postAccount: PublicKey;

  before(async () => {
    await airdrop(host.publicKey);
    await airdrop(editor.publicKey);

    // Set up host profile
    const hostProfile = await setupProfile(host.publicKey, program);
    hostProfileAccount = hostProfile.profileAccount;
    const host_profile_tx = hostProfile.profileTx;
    await host_anchor_wallet.signTransaction(host_profile_tx);
    await provider.sendAndConfirm(host_profile_tx, [host]);

    // Set up editor profile
    await airdrop(editor.publicKey);
    const editorProfile = await setupProfile(editor.publicKey, program);
    editorProfileAccount = editorProfile.profileAccount;
    const editor_profile_tx = editorProfile.profileTx;
    await editor_anchor_wallet.signTransaction(editor_profile_tx);
    await provider.sendAndConfirm(editor_profile_tx, [editor]);
  });

  it("create editor", async () => {
    // Set up Editor
    const editorSeed = [
      Buffer.from("editor"),
      hostProfileAccount.toBuffer(),
      editorProfileAccount.toBuffer(),
    ];
    [editorAccount] = await anchor.web3.PublicKey.findProgramAddress(
      editorSeed,
      program.programId
    );
    try {
      const editor_tx = await program.methods
        .createEditor()
        .accounts({
          editor: editorAccount,
          hostProfile: hostProfileAccount,
          editorProfile: editorProfileAccount,
          authority: host.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .transaction();
      editor_tx.feePayer = host.publicKey;
      editor_tx.recentBlockhash = (await provider.connection.getLatestBlockhash())
        .blockhash;
      await host_anchor_wallet.signTransaction(editor_tx);
      await provider.sendAndConfirm(editor_tx, [host]);
    } catch (error) {
      console.log(error);
    }
    const data = await program.account.editor.fetch(editorAccount);
    expect(data.hostProfile.toString()).to.equal(hostProfileAccount.toString());
    expect(data.editorProfile.toString()).to.equal(
      editorProfileAccount.toString()
    );
  });

  it("should not allow unauthorized editor creation", async () => {
    const editorUser = anchor.web3.Keypair.generate();
    const editorUser_anchor_wallet = new anchor.Wallet(editorUser);
    await airdrop(editorUser.publicKey);

    // Set up editorUser profile
    const editorUserProfile = await setupProfile(editorUser.publicKey, program);
    const editorUserProfileAccount = editorUserProfile.profileAccount;
    const editor_profile_tx = editorUserProfile.profileTx;
    await editorUser_anchor_wallet.signTransaction(editor_profile_tx);
    await provider.sendAndConfirm(editor_profile_tx, [editorUser]);

    const editorSeed = [
      Buffer.from("editor"),
      hostProfileAccount.toBuffer(),
      editorUserProfileAccount.toBuffer(),
    ];
    const [editorUserAccount] = await anchor.web3.PublicKey.findProgramAddress(
      editorSeed,
      program.programId
    );
    try {
      const editor_tx = await program.methods
        .createEditor()
        .accounts({
          editor: editorUserAccount,
          hostProfile: hostProfileAccount,
          editorProfile: editorUserProfileAccount,
          authority: editorUser.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .transaction();
      editor_tx.feePayer = editorUser.publicKey;
      editor_tx.recentBlockhash = (await provider.connection.getLatestBlockhash())
        .blockhash;
      await editorUser_anchor_wallet.signTransaction(editor_tx);
      await provider.sendAndConfirm(editor_tx, [editorUser]);
    } catch (error) {
      expect(error).to.be.an("error");
      expect(error.toString()).to.contain("custom program error: 0x7d1");
    }
  });

  it("create post as editor", async () => {
    const postRandomHash = randombytes(32);
    const metadataUri =
      "https://gist.githubusercontent.com/abishekk92/10593977/raw/589238c3d48e654347d6cbc1e29c1e10dadc7cea/monoid.md";
    const postSeed = [
      Buffer.from("post"),
      postRandomHash,
    ];
    [postAccount] = await anchor.web3.PublicKey.findProgramAddress(
      postSeed,
      program.programId
    );
    try {
      const editor_post_tx = await program.methods
        .createPostAsEditor(metadataUri, postRandomHash)
        .accounts({
          post: postAccount,
          hostProfile: hostProfileAccount,
          editorProfile: editorProfileAccount,
          editor: editorAccount,
          authority: editor.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .transaction();
      editor_post_tx.feePayer = editor.publicKey;
      editor_post_tx.recentBlockhash = (await provider.connection.getLatestBlockhash())
        .blockhash;
      await editor_anchor_wallet.signTransaction(editor_post_tx);
      await provider.sendAndConfirm(editor_post_tx, [editor]);
    } catch (error) {
      console.log(`Error creating post as editor`);
      console.log(error);
    }
    const data = await program.account.post.fetch(postAccount);
    expect(data.metadataUri).to.equal(metadataUri);
  });

  it("update post as editor", async () => {
    const metadataUri =
      "https://gist.githubusercontent.com/abishekk92/10593977/raw/monoid.md";
    try {
      const editor_post_tx = await program.methods
        .updatePostAsEditor(metadataUri)
        .accounts({
          post: postAccount,
          hostProfile: hostProfileAccount,
          editorProfile: editorProfileAccount,
          editor: editorAccount,
          authority: editor.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .transaction();
      editor_post_tx.feePayer = editor.publicKey;
      editor_post_tx.recentBlockhash = (await provider.connection.getLatestBlockhash())
        .blockhash;
      await editor_anchor_wallet.signTransaction(editor_post_tx);
      await provider.sendAndConfirm(editor_post_tx, [editor]);
    } catch (error) {
      console.log(`Error updating post as editor`);
      console.log(error);
    }
    const data = await program.account.post.fetch(postAccount);
    expect(data.metadataUri).to.equal(metadataUri);
  });

  it("update post as host", async () => {
    const metadataUri =
      "https://gist.githubusercontent.com/shekdev/10593977/raw/589238c3d48e654347d6cbc1e29c1e10dadc7cea/monoid.md";
    try {
      const host_post_tx = await program.methods
        .updatePost(metadataUri)
        .accounts({
          post: postAccount,
          profile: hostProfileAccount,
          authority: host.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .transaction();
      host_post_tx.feePayer = host.publicKey;
      host_post_tx.recentBlockhash = (await provider.connection.getLatestBlockhash())
        .blockhash;
      await host_anchor_wallet.signTransaction(host_post_tx);
      await provider.sendAndConfirm(host_post_tx, [host]);
    } catch (error) {
      console.log(`Error updating post as host`);
      console.log(error);
    }
    const data = await program.account.post.fetch(postAccount);
    expect(data.metadataUri).to.equal(metadataUri);
  });

  it("should not allow unauthorized update", async () => {
    const randomUser = anchor.web3.Keypair.generate();
    const randomUser_anchor_wallet = new anchor.Wallet(randomUser);
    await airdrop(randomUser.publicKey);

    // Set up randomUser profile
    const randomUserPrfile = await setupProfile(randomUser.publicKey, program);
    const randomUserProfileAccount = randomUserPrfile.profileAccount;
    const randomUser_profile_tx = randomUserPrfile.profileTx;
    await randomUser_anchor_wallet.signTransaction(randomUser_profile_tx);
    await provider.sendAndConfirm(randomUser_profile_tx, [randomUser]);

    // Set up post
    const postRandomHash = randombytes(32);
    const metadataUri =
      "https://gist.githubusercontent.com/abishekk92/10593977/raw/589238c3d48e654347d6cbc1e29c1e10dadc7cea/monoid.md";
    const postSeed = [
      Buffer.from("post"),
      postRandomHash,
    ];
    const [randomUserPostAccount] = await anchor.web3.PublicKey.findProgramAddress(
      postSeed,
      program.programId
    );
    const tx = await program.methods
      .createPostAsEditor(metadataUri, postRandomHash)
      .accounts({
        post: randomUserPostAccount,
        hostProfile: randomUserProfileAccount,
        editorProfile: editorProfileAccount,
        editor: editorAccount,
        authority: randomUser.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .transaction();
    tx.feePayer = randomUser.publicKey;
    tx.recentBlockhash = (await provider.connection.getLatestBlockhash())
      .blockhash;
    await randomUser_anchor_wallet.signTransaction(tx);
    try {
      await provider.sendAndConfirm(tx, [randomUser]);
    } catch (error) {
      expect(error).to.be.an("error");
      expect(error.toString()).to.contain("custom program error: 0x7d1");
    }
  });

  it("should not allow unauthorized delete of post as editor", async () => {
    const randomUser = anchor.web3.Keypair.generate();
    const randomUser_anchor_wallet = new anchor.Wallet(randomUser);
    await airdrop(randomUser.publicKey);

    const randomUser_post_tx = await program.methods
      .deletePostAsEditor()
      .accounts({
        post: postAccount,
        hostProfile: hostProfileAccount,
        editorProfile: editorProfileAccount,
        editor: editorAccount,
        authority: randomUser.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .transaction();
    randomUser_post_tx.feePayer = randomUser.publicKey;
    randomUser_post_tx.recentBlockhash = (await provider.connection.getLatestBlockhash())
      .blockhash;
    await randomUser_anchor_wallet.signTransaction(randomUser_post_tx);
    try {
      await provider.sendAndConfirm(randomUser_post_tx, [randomUser]);
    } catch (error) {
      expect(error).to.be.an("error");
      expect(error.toString()).to.contain("custom program error: 0x7d1");
    }
  });

  it("should delete post as editor", async () => {
    try {
      const editor_post_tx = await program.methods
        .deletePostAsEditor()
        .accounts({
          post: postAccount,
          hostProfile: hostProfileAccount,
          editorProfile: editorProfileAccount,
          editor: editorAccount,
          authority: editor.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .transaction();
      editor_post_tx.feePayer = editor.publicKey;
      editor_post_tx.recentBlockhash = (await provider.connection.getLatestBlockhash())
        .blockhash;
      await editor_anchor_wallet.signTransaction(editor_post_tx);
      await provider.sendAndConfirm(editor_post_tx, [editor]);
    } catch (error) {
      console.log(`Error deleting post as editor`);
      console.log(error);
    }
    try {
      await program.account.post.fetch(postAccount);
    } catch (error) {
      expect(error).to.be.an("error");
      expect(error.toString()).to.contain(`Account does not exist ${postAccount.toString()}`);
    }
  });


  it("remove editor", async () => {
    try {
      const editor_tx = await program.methods
        .removeEditor()
        .accounts({
          editor: editorAccount,
          hostProfile: hostProfileAccount,
          editorProfile: editorProfileAccount,
          authority: host.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .transaction();
      editor_tx.feePayer = host.publicKey;
      editor_tx.recentBlockhash = (await provider.connection.getLatestBlockhash())
        .blockhash;
      await host_anchor_wallet.signTransaction(editor_tx);
      await provider.sendAndConfirm(editor_tx, [host]);
    } catch (error) {
      console.log(error);
    }
    try {
      const data = await program.account.editor.fetch(editorAccount);
    } catch (error) {
      expect(error).to.be.an("error");
      expect(error.toString()).to.contain(`Account does not exist ${editorAccount.toString()}`);
    }
  });
});