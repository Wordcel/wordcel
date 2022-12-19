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

  before(async () => {
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
  });

  describe("Profile", async () => {
    it("should initialize", async () => {
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
      await program.methods
        .createPost(metadataUri, randomHash)
        .accounts({
          post: postAccount,
          profile: profileAccount,
          authority: user,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      const post = await program.account.post.fetch(postAccount);
      expect(post.metadataUri).to.equal(metadataUri);
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
      onePostAccount = postAccount;
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
      await program.methods
        .initializeConnection()
        .accounts({
          connection: connectionAccount,
          profile: profileAccount,
          authority: randomUser.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([randomUser])
        .rpc();
      const connection = await program.account.connection.fetch(
        connectionAccount
      );
      expect(connection.profile.toString()).to.equal(profileAccount.toString());
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
      try {
        await program.methods
          .initializeConnection()
          .accounts({
            connection: connectionAccount,
            profile: profileAccount,
            authority: randomUser.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([randomUser])
          .rpc();
      } catch (error) {
        expect(error.toString()).to.contain("custom program error: 0x0");
      }
    });

    describe("Close Connection", () => {
      // Test must be run synchronously and in the specified order to avoid attepting to close an account that doesn't exist.
      it("should not allow unauthorized closing of connection", async () => {
        const closeUser = anchor.web3.Keypair.generate();
        try {
          await program.methods
            .closeConnection()
            .accounts({
              connection: connectionAccount,
              profile: profileAccount,
              authority: closeUser.publicKey,
              systemProgram: SystemProgram.programId,
            })
            .signers([closeUser])
            .rpc();
        } catch (error) {
          const anchorError = AnchorError.parse(error.logs);
          expect(anchorError.error.errorCode.code).to.equal("ConstraintSeeds");
        }
      });

      it("should only allow the user to close the connection", async () => {
        await program.methods
          .closeConnection()
          .accounts({
            connection: connectionAccount,
            profile: profileAccount,
            authority: randomUser.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([randomUser])
          .rpc();
        try {
          await program.account.connection.fetch(connectionAccount);
        } catch (error) {
          expect(error).to.be.an("error");
          expect(error.toString()).to.contain("Error: Account does not exist");
        }
      });
    });
  });

  describe("Connections V2", async () => {
    const profileRandomHash = randombytes(32);
    const [testProfileAccount, _bump] =
      await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from("profile"), profileRandomHash],
        program.programId
      );
    let testUser = anchor.web3.Keypair.generate();
    const connectionBoxHash = randombytes(32);
    const connectionBoxSeeds = [
      Buffer.from("connection_box"),
      connectionBoxHash,
    ];

    const connectionSeeds = [
      Buffer.from("connection"),
      testUser.publicKey.toBuffer(),
      testProfileAccount.toBuffer(),
    ];

    const connectionV2Seeds = [
      Buffer.from("connection_v2"),
      testProfileAccount.toBuffer(),
    ];

    const [connectionBoxAccount, _bump1] =
      await anchor.web3.PublicKey.findProgramAddress(
        connectionBoxSeeds,
        program.programId
      );

    const [connectionV2Account, _bump2] =
      await anchor.web3.PublicKey.findProgramAddress(
        connectionV2Seeds,
        program.programId
      );

    const [connectionAccount, _bump3] =
      await anchor.web3.PublicKey.findProgramAddress(
        connectionSeeds,
        program.programId
      );

    before(async () => {
      await airdrop(testUser.publicKey);
      await program.methods
        .initialize(profileRandomHash)
        .accounts({
          profile: testProfileAccount,
          user: user,
          invitation: inviteAccount,
          invitationProgram: invitationProgram.programId,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    });

    it("should initialize connection box", async () => {
      await program.methods
        .initializeConnectionBox(connectionBoxHash)
        .accounts({
          connectionBox: connectionBoxAccount,
          authority: testUser.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([testUser])
        .rpc();
      const connectionBoxData = await program.account.connectionBox.fetch(
        connectionBoxAccount
      );
      expect(connectionBoxData.authority.toString()).to.equal(
        testUser.publicKey.toString()
      );
    });

    it("should initialize connections_v2", async () => {
      await program.methods
        .initializeConnectionV2()
        .accounts({
          connection: connectionV2Account,
          connectionBox: connectionBoxAccount,
          profile: testProfileAccount,
          authority: testUser.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([testUser])
        .rpc();
      const connectionV2Data = await program.account.connectionV2.fetch(
        connectionV2Account
      );
      expect(connectionV2Data.connectionBox.toString()).to.equal(
        connectionBoxAccount.toString()
      );
    });

    it("should close connections_v2", async () => {
      await program.methods
        .closeConnectionV2()
        .accounts({
          connection: connectionV2Account,
          connectionBox: connectionBoxAccount,
          profile: testProfileAccount,
          authority: testUser.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([testUser])
        .rpc();

      try {
        await program.account.connectionV2.fetch(connectionV2Account);
      } catch (error) {
        expect(error.toString()).to.contain("Error: Account does not exist");
      }
    });

    it("should allow the user to migrate connections from v1 to v2", async () => {
      const connectionV1IX = await program.methods
        .initializeConnection()
        .accounts({
          connection: connectionAccount,
          profile: testProfileAccount,
          authority: testUser.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([testUser])
        .instruction();

      await program.methods
        .migrateToConnectionv2()
        .accounts({
          connectionV1: connectionAccount,
          connectionV2: connectionV2Account,
          profile: testProfileAccount,
          connectionBox: connectionBoxAccount,
          authority: testUser.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .preInstructions([connectionV1IX])
        .signers([testUser])
        .rpc();

      try {
        await program.account.connection.fetch(connectionAccount);
      } catch (error) {
        expect(error.toString()).to.contain("Error: Account does not exist");
      }
      const connectionV2Data = await program.account.connectionV2.fetch(
        connectionV2Account
      );
      expect(connectionV2Data.connectionBox.toString()).to.equal(
        connectionBoxAccount.toString()
      );
      await program.methods
        .closeConnectionV2()
        .accounts({
          connection: connectionV2Account,
          connectionBox: connectionBoxAccount,
          profile: testProfileAccount,
          authority: testUser.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([testUser])
        .rpc();
    });

    it("should allow the admin to seemelessly migrate connections from v1 to v2", async () => {
      const randomUser = anchor.web3.Keypair.generate();
      await airdrop(randomUser.publicKey);

      const connectionBoxHash = randombytes(32);
      const connectionBoxSeeds = [
        Buffer.from("connection_box"),
        connectionBoxHash,
      ];

      const connectionSeeds = [
        Buffer.from("connection"),
        randomUser.publicKey.toBuffer(),
        testProfileAccount.toBuffer(),
      ];

      const connectionV2Seeds = [
        Buffer.from("connection_v2"),
        testProfileAccount.toBuffer(),
      ];

      const [connectionBoxAccount, _bump1] =
        await anchor.web3.PublicKey.findProgramAddress(
          connectionBoxSeeds,
          program.programId
        );

      const [connectionV2Account, _bump2] =
        await anchor.web3.PublicKey.findProgramAddress(
          connectionV2Seeds,
          program.programId
        );

      const [connectionAccount, _bump3] =
        await anchor.web3.PublicKey.findProgramAddress(
          connectionSeeds,
          program.programId
        );

      await program.methods
        .initializeConnection()
        .accounts({
          connection: connectionAccount,
          profile: testProfileAccount,
          authority: randomUser.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([randomUser])
        .rpc();

      await program.methods
        .migrateToConnectionv2Admin(connectionBoxHash)
        .accounts({
          connectionV1: connectionAccount,
          connectionV2: connectionV2Account,
          profile: testProfileAccount,
          connectionBox: connectionBoxAccount,
          authority: randomUser.publicKey,
          payer: user,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      try {
        await program.account.connection.fetch(connectionAccount);
      } catch (error) {
        expect(error.toString()).to.contain("Error: Account does not exist");
      }
      const connectionBoxData = await program.account.connectionBox.fetch(
        connectionBoxAccount
      );
      expect(connectionBoxData.authority.toString()).to.equal(
        randomUser.publicKey.toString()
      );

      const connectionV2Data = await program.account.connectionV2.fetch(
        connectionV2Account
      );
      expect(connectionV2Data.connectionBox.toString()).to.equal(
        connectionBoxAccount.toString()
      );
      await program.methods
        .closeConnectionV2()
        .accounts({
          connection: connectionV2Account,
          connectionBox: connectionBoxAccount,
          profile: testProfileAccount,
          authority: randomUser.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([randomUser])
        .rpc();
    });

    it("should not allow anyone other than the admin to seemelessly migrate connections from v1 to v2", async () => {
      const randomUser = anchor.web3.Keypair.generate();
      await airdrop(randomUser.publicKey);

      const connectionBoxHash = randombytes(32);
      const connectionBoxSeeds = [
        Buffer.from("connection_box"),
        connectionBoxHash,
      ];

      const connectionSeeds = [
        Buffer.from("connection"),
        randomUser.publicKey.toBuffer(),
        testProfileAccount.toBuffer(),
      ];

      const connectionV2Seeds = [
        Buffer.from("connection_v2"),
        testProfileAccount.toBuffer(),
      ];

      const [connectionBoxAccount, _bump1] =
        await anchor.web3.PublicKey.findProgramAddress(
          connectionBoxSeeds,
          program.programId
        );

      const [connectionV2Account, _bump2] =
        await anchor.web3.PublicKey.findProgramAddress(
          connectionV2Seeds,
          program.programId
        );
      const [connectionAccount, _bump3] =
        await anchor.web3.PublicKey.findProgramAddress(
          connectionSeeds,
          program.programId
        );

      await program.methods
        .initializeConnection()
        .accounts({
          connection: connectionAccount,
          profile: testProfileAccount,
          authority: randomUser.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([randomUser])
        .rpc();

      try {
        await program.methods
          .migrateToConnectionv2Admin(connectionBoxHash)
          .accounts({
            connectionV1: connectionAccount,
            connectionV2: connectionV2Account,
            profile: testProfileAccount,
            connectionBox: connectionBoxAccount,
            authority: randomUser.publicKey,
            payer: testUser.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([testUser])
          .rpc();
      } catch (e) {
        const { error } = AnchorError.parse(e.logs);
        expect(error.errorCode.code).to.equal("UnAuthorizedAccess");
      }
    });
  });
});
