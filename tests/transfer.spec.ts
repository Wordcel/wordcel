import * as anchor from "@project-serum/anchor";
import { Program, AnchorError } from "@project-serum/anchor";
import { Wordcel } from "../target/types/wordcel";
import { expect } from "chai";
import { PublicKey } from "@solana/web3.js";
import randombytes from "randombytes";
import { getInviteAccount, invitationProgram } from "./utils/invite";
import { airdrop } from "./utils";
const { SystemProgram } = anchor.web3;
const provider = anchor.getProvider();

const program = anchor.workspace.Wordcel as Program<Wordcel>;
const user = provider.wallet.publicKey;

// NOTE:
// State Transtion happens as follows:
// New Invite -> New Profile -> New Post -> Identify new authority -> Send invite -> Transfer authority -> Old authority can't edit -> New authority can edit.
// How will the transfer work for connections?

describe("Wordcel", async () => {
  const originalAuthority = anchor.web3.Keypair.generate();
  const newAuthority = anchor.web3.Keypair.generate();

  let originalAuthorityInvite: PublicKey;
  let newAuthorityInvite: PublicKey;

  let lastPostHash: Buffer;
  let lastPostAccount: PublicKey;

  let profileHash = randombytes(32);
  const profileSeed = [Buffer.from("profile"), profileHash];
  const [profileAccount, _] = await anchor.web3.PublicKey.findProgramAddress(
    profileSeed,
    program.programId
  );

  before(async () => {
    await airdrop(originalAuthority.publicKey);
    await airdrop(newAuthority.publicKey);

    originalAuthorityInvite = await getInviteAccount(
      originalAuthority.publicKey
    );

    await invitationProgram.methods
      .initialize()
      .accounts({
        inviteAccount: originalAuthorityInvite,
        authority: originalAuthority.publicKey,
        payer: user,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    newAuthorityInvite = await getInviteAccount(newAuthority.publicKey);
    await invitationProgram.methods
      .initialize()
      .accounts({
        inviteAccount: newAuthorityInvite,
        authority: newAuthority.publicKey,
        payer: user,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .initialize(profileHash)
      .accounts({
        profile: profileAccount,
        user: originalAuthority.publicKey,
        invitation: originalAuthorityInvite,
        invitationProgram: invitationProgram.programId,
        systemProgram: SystemProgram.programId,
      })
      .signers([originalAuthority])
      .rpc();

    const postRandomHash = randombytes(32);
    const postSeeds = [Buffer.from("post"), postRandomHash];
    const [postAccount, _bump] = await anchor.web3.PublicKey.findProgramAddress(
      postSeeds,
      program.programId
    );

    const metadataUri =
      "https://gist.githubusercontent.com/abishekk92/10593977/raw/589238c3d48e654347d6cbc1e29c1e10dadc7cea/monoid.md";

    const newPostIX = await program.methods
      .createPost(metadataUri, postRandomHash)
      .accounts({
        post: postAccount,
        profile: profileAccount,
        authority: originalAuthority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([originalAuthority])
      .rpc();

    lastPostHash = postRandomHash;
    lastPostAccount = postAccount;
  });

  describe("Transfer Profile", async () => {
    it("should execute transfer", async () => {
      await program.methods
        .transferProfile()
        .accounts({
          profile: profileAccount,
          invitation: originalAuthorityInvite,
          newAuthorityInvitation: newAuthorityInvite,
          authority: originalAuthority.publicKey,
          newAuthority: newAuthority.publicKey,
          systemProgram: SystemProgram.programId,
          invitationProgram: invitationProgram.programId,
        })
        .signers([originalAuthority])
        .rpc();

      const profileData = await program.account.profile.fetch(profileAccount);
      expect(profileData.authority.toString()).to.equal(
        newAuthority.publicKey.toString()
      );
    });

    it("should not allow the old authority to edit", async () => {
      const metadataUri =
        "https://gist.githubusercontent.com/shekdev/10593977/raw/589238c3d48e654347d6cbc1e29c1e10dadc7cea/monoid.md";
      try {
        await program.methods
          .updatePost(metadataUri)
          .accounts({
            post: lastPostAccount,
            profile: profileAccount,
            authority: originalAuthority.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([originalAuthority])
          .rpc();
      } catch (e) {
        const { error } = AnchorError.parse(e.logs);
        expect(error.errorMessage).to.equal(
          "A has one constraint was violated"
        );
      }
    });

    it("should allow the new authority to edit", async () => {
      const metadataUri =
        "https://gist.githubusercontent.com/shekdev/10593977/raw/589238c3d48e654347d6cbc1e29c1e10dadc7cea/monoid.md";
      await program.methods
        .updatePost(metadataUri)
        .accounts({
          post: lastPostAccount,
          profile: profileAccount,
          authority: newAuthority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([newAuthority])
        .rpc();
      const postData = await program.account.post.fetch(lastPostAccount);
      expect(postData.metadataUri).to.equal(metadataUri);
    });

    it("should not allow the old authority to create a new post", async () => {
      const postRandomHash = randombytes(32);
      const postSeeds = [Buffer.from("post"), postRandomHash];
      const [postAccount, _bump] =
        await anchor.web3.PublicKey.findProgramAddress(
          postSeeds,
          program.programId
        );
      const metadataUri =
        "https://gist.githubusercontent.com/shekdev/10593977/raw/589238c3d48e654347d6cbc1e29c1e10dadc7cea/monoid.md";
      try {
        await program.methods
          .createPost(metadataUri, postRandomHash)
          .accounts({
            post: postAccount,
            profile: profileAccount,
            authority: originalAuthority.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([originalAuthority])
          .rpc();
      } catch (e) {
        const { error } = AnchorError.parse(e.logs);
        expect(error.errorMessage).to.equal(
          "A has one constraint was violated"
        );
      }
    });

    it("should allow the new authority to create a new post", async () => {
      const postRandomHash = randombytes(32);
      const postSeeds = [Buffer.from("post"), postRandomHash];
      const [postAccount, _bump] =
        await anchor.web3.PublicKey.findProgramAddress(
          postSeeds,
          program.programId
        );
      const metadataUri =
        "https://gist.githubusercontent.com/shekdev/10593977/raw/589238c3d48e654347d6cbc1e29c1e10dadc7cea/monoid.md";
      await program.methods
        .createPost(metadataUri, postRandomHash)
        .accounts({
          post: postAccount,
          profile: profileAccount,
          authority: newAuthority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([newAuthority])
        .rpc();
      const postData = await program.account.post.fetch(postAccount);
      expect(postData.metadataUri).to.equal(metadataUri);
    });
  });

  describe("Transfer Connections", async () => {
    it("should transfer connections", async () => {
      const connectionBoxHash = randombytes(32);
      const connectionBoxSeeds = [
        Buffer.from("connection_box"),
        connectionBoxHash,
      ];
      const [connectionBoxAccount, _] =
        await anchor.web3.PublicKey.findProgramAddress(
          connectionBoxSeeds,
          program.programId
        );

      const newConnectionBoxIX = await program.methods
        .initializeConnectionBox(connectionBoxHash)
        .accounts({
          connectionBox: connectionBoxAccount,
          authority: originalAuthority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([originalAuthority])
        .instruction();

      await program.methods
        .transferConnectionBox()
        .accounts({
          connectionBox: connectionBoxAccount,
          authority: originalAuthority.publicKey,
          newAuthority: newAuthority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .preInstructions([newConnectionBoxIX])
        .signers([originalAuthority])
        .rpc();

      const connectionBoxData = await program.account.connectionBox.fetch(
        connectionBoxAccount
      );
      expect(connectionBoxData.authority.toString()).to.equal(
        newAuthority.publicKey.toString()
      );
    });
  });
});
