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

describe("wordcel", async () => {
  const randomHash = randombytes(32);
  const profileSeed = [Buffer.from("profile"), randomHash];
  const [profileAccount, _] = await anchor.web3.PublicKey.findProgramAddress(
    profileSeed,
    program.programId
  );
  let onePostAccount: PublicKey;
  let inviteAccount: PublicKey;

  describe("Profile", async () => {
    it("should initialize", async () => {
      // Initialize Invitation Account
      inviteAccount = await getInviteAccount(user);
      await invitationProgram.methods
        .initialize()
        .accounts({
          inviteAccount: inviteAccount,
          authority: user,
          payer: user,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      await program.methods
        .initialize(randomHash)
        .accounts({
          profile: profileAccount,
          user: user,
          invitation: inviteAccount,
          invitationProgram: invitationProgram.programId,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      const data = await program.account.profile.fetch(profileAccount);
      expect(data.authority.toString()).to.equal(user.toString());
    });
  });

  describe("Post", async () => {
    it("should create a new post", async () => {
      const randomHash = randombytes(32);
      const postSeeds = [Buffer.from("post"), randomHash];
      const [postAccount, _] = await anchor.web3.PublicKey.findProgramAddress(
        postSeeds,
        program.programId
      );
      const metadataUri =
        "https://gist.githubusercontent.com/abishekk92/10593977/raw/589238c3d48e654347d6cbc1e29c1e10dadc7cea/monoid.md";
      let listener = null;
      let [event, slot] = await new Promise(async (resolve) => {
        listener = program.addEventListener("NewPost", async (event, slot) => {
          resolve([event, slot]);
        });
        // Create Post
        await program.methods
          .createPost(metadataUri, randomHash)
          .accounts({
            post: postAccount,
            profile: profileAccount,
            authority: user,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
      });
      await program.removeEventListener(listener);

      const post = await program.account.post.fetch(postAccount);
      expect(post.metadataUri).to.equal(metadataUri);
      expect(event.post.toString()).to.equal(postAccount.toString());
      expect(event.profile.toString()).to.equal(post.profile.toString());
      expect(slot).to.be.above(0);
      onePostAccount = postAccount;
    });

    it("should update post", async () => {
      const metadataUri =
        "https://gist.githubusercontent.com/shekdev/10593977/raw/589238c3d48e654347d6cbc1e29c1e10dadc7cea/monoid.md";
      await program.methods
        .updatePost(metadataUri)
        .accounts({
          post: onePostAccount,
          profile: profileAccount,
          authority: user,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      const post = await program.account.post.fetch(onePostAccount);
      expect(post.metadataUri).to.equal(metadataUri);
    });

    it("should only allow the post to be edited with the original profile", async () => {
      const randomHash = randombytes(32);
      const profileSeed = [Buffer.from("profile"), randomHash];
      const [newProfileAccount, _] =
        await anchor.web3.PublicKey.findProgramAddress(
          profileSeed,
          program.programId
        );
      // Initialize Invitation Account
      await program.methods
        .initialize(randomHash)
        .accounts({
          profile: newProfileAccount,
          user: user,
          invitation: inviteAccount,
          invitationProgram: invitationProgram.programId,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      const metadataUri =
        "https://gist.githubusercontent.com/shekdev/10593977/raw/589238c3d48e654347d6cbc1e29c1e10dadc7cea/monoid.md";
      try {
        await program.methods
          .updatePost(metadataUri)
          .accounts({
            post: onePostAccount,
            profile: newProfileAccount,
            authority: user,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
      } catch (error) {
        expect(error).to.be.an("error");
        expect(error.toString()).to.contain("Error Code: ConstraintHasOne");
      }
    });

    it("should create a post as a comment", async () => {
      const randomHash = randombytes(32);
      const postSeeds = [
        Buffer.from("post"),
        randomHash,
        onePostAccount.toBuffer(),
      ];
      const [postAccount, _] = await anchor.web3.PublicKey.findProgramAddress(
        postSeeds,
        program.programId
      );
      const metadataUri =
        "https://gist.githubusercontent.com/abishekk92/10593977/raw/589238c3d48e654347d6cbc1e29c1e10dadc7cea/monoid.md";
      await program.methods
        .comment(metadataUri, randomHash)
        .accounts({
          post: postAccount,
          profile: profileAccount,
          replyTo: onePostAccount,
          authority: user,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      const post = await program.account.post.fetch(postAccount);
      expect(post.metadataUri).to.equal(metadataUri);
    });

    it("should delete a post", async () => {
      await program.methods
        .closePost()
        .accounts({
          post: onePostAccount,
          profile: profileAccount,
          authority: user,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      try {
        await program.account.post.fetch(onePostAccount);
      } catch (error) {
        expect(error).to.be.an("error");
        expect(error.toString()).to.contain("Error: Account does not exist");
      }
    });
  });

  describe("Connection", async () => {
    let randomUser: Keypair;
    let connectionAccount: PublicKey;

    before(async () => {
      randomUser = anchor.web3.Keypair.generate();
      await airdrop(randomUser.publicKey);
      const connectionSeeds = [
        Buffer.from("connection"),
        randomUser.publicKey.toBuffer(),
        profileAccount.toBuffer(),
      ];
      const [account, _] = await anchor.web3.PublicKey.findProgramAddress(
        connectionSeeds,
        program.programId
      );
      connectionAccount = account;
    });

    it("should create a connection", async () => {
      let listener = null;
      let [event, slot] = await new Promise(async (resolve) => {
        listener = program.addEventListener(
          "NewFollower",
          async (event, slot) => {
            resolve([event, slot]);
          }
        );
        // Initialize Connection
        const tx = await program.methods
          .initializeConnection()
          .accounts({
            connection: connectionAccount,
            profile: profileAccount,
            authority: randomUser.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .transaction();
        tx.feePayer = user;
        tx.recentBlockhash = (
          await provider.connection.getRecentBlockhash()
        ).blockhash;
        tx.sign(randomUser);
        await provider.sendAndConfirm(tx);
      });
      await program.removeEventListener(listener);

      const connection = await program.account.connection.fetch(
        connectionAccount
      );
      expect(connection.profile.toString()).to.equal(profileAccount.toString());
      expect(event.user.toString()).to.equal(connection.authority.toString());
      expect(event.followed.toString()).to.equal(connectionAccount.toString());
      expect(slot).to.be.above(0);
    });

    it("should not let a user to follow themselves", async () => {
      const connectionSeeds = [
        Buffer.from("connection"),
        user.toBuffer(),
        profileAccount.toBuffer(),
      ];
      const [connectionAccount, _] =
        await anchor.web3.PublicKey.findProgramAddress(
          connectionSeeds,
          program.programId
        );
      try {
        await program.methods
          .initializeConnection()
          .accounts({
            connection: connectionAccount,
            profile: profileAccount,
            authority: user,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
      } catch (error) {
        const anchorError = AnchorError.parse(error.logs);
        expect(anchorError.error.errorCode.code).to.equal("SelfFollow");
      }
    });

    it("should not create a connection again", async () => {
      const tx = await program.methods
        .initializeConnection()
        .accounts({
          connection: connectionAccount,
          profile: profileAccount,
          authority: randomUser.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .transaction();
      tx.feePayer = user;
      tx.recentBlockhash = (
        await provider.connection.getRecentBlockhash()
      ).blockhash;
      tx.sign(randomUser);
      try {
        await provider.sendAndConfirm(tx);
      } catch (error) {
        expect(error).to.be.an("error");
        expect(error.toString()).to.contain("custom program error: 0x0");
      }
    });

    describe("Close Connection", () => {
      // Test must be run synchronously and in the specified order to avoid attepting to close an account that doesn't exist.
      it("should not allow unauthorized closing of connection", async () => {
        const closeUser = anchor.web3.Keypair.generate();
        const tx = await program.methods
          .closeConnection()
          .accounts({
            connection: connectionAccount,
            profile: profileAccount,
            authority: closeUser.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .transaction();
        tx.feePayer = user;
        tx.recentBlockhash = (
          await provider.connection.getRecentBlockhash()
        ).blockhash;
        tx.sign(closeUser);
        try {
          await provider.sendAndConfirm(tx);
        } catch (error) {
          expect(error).to.be.an("error");
          expect(error.toString()).to.contain("custom program error: 0x7d6");
        }
      });

      it("should only allow the user to close the connection", async () => {
        const tx = await program.methods
          .closeConnection()
          .accounts({
            connection: connectionAccount,
            profile: profileAccount,
            authority: randomUser.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .transaction();
        tx.feePayer = user;
        tx.recentBlockhash = (
          await provider.connection.getRecentBlockhash()
        ).blockhash;
        tx.sign(randomUser);
        await provider.sendAndConfirm(tx);
        try {
          await program.account.connection.fetch(connectionAccount);
        } catch (error) {
          expect(error).to.be.an("error");
          expect(error.toString()).to.contain("Error: Account does not exist");
        }
      });
    });
  });
});
