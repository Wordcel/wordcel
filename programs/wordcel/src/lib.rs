use anchor_lang::prelude::*;

mod instructions;
mod state;

use instructions::*;
use state::*;

#[cfg(not(any(feature = "mainnet", feature = "devnet")))]
declare_id!("v4enuof3drNvU2Y3b5m7K62hMq3QUP6qQSV2jjxAhkp");

#[cfg(feature = "devnet")]
declare_id!("D9JJgeRf2rKq5LNMHLBMb92g4ZpeMgCyvZkd7QKwSCzg");

#[cfg(feature = "mainnet")]
declare_id!("EXzAYHZ8xS6QJ6xGRsdKZXixoQBLsuMbmwJozm85jHp");

#[program]
pub mod wordcel {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, random_hash: [u8; 32]) -> Result<()> {
        let profile = &mut ctx.accounts.profile;
        profile.random_hash = random_hash;
        profile.bump = *ctx.bumps.get("profile").unwrap();
        profile.authority = *ctx.accounts.user.to_account_info().key;
        Ok(())
    }

    pub fn create_post(
        ctx: Context<CreatePost>,
        metadata_uri: String,
        random_hash: [u8; 32],
    ) -> Result<()> {
        if metadata_uri.len() > MAX_LEN_URI {
            return Err(error!(PostError::URITooLarge));
        }

        let post = &mut ctx.accounts.post;
        post.random_hash = random_hash;
        post.bump = *ctx.bumps.get("post").unwrap();
        post.metadata_uri = metadata_uri;
        post.profile = *ctx.accounts.profile.to_account_info().key;
        Ok(())
    }

    pub fn update_post(ctx: Context<UpdatePost>, metadata_uri: String) -> Result<()> {
        if metadata_uri.len() > MAX_LEN_URI {
            return Err(error!(PostError::URITooLarge));
        }
        let post = &mut ctx.accounts.post;
        post.metadata_uri = metadata_uri;
        Ok(())
    }

    pub fn comment(
        ctx: Context<Comment>,
        metadata_uri: String,
        random_hash: [u8; 32],
    ) -> Result<()> {
        if metadata_uri.len() > MAX_LEN_URI {
            return Err(error!(PostError::URITooLarge));
        }

        let post = &mut ctx.accounts.post;
        post.random_hash = random_hash;
        post.bump = *ctx.bumps.get("post").unwrap();
        post.metadata_uri = metadata_uri;
        post.reply_to = Some(*ctx.accounts.reply_to.to_account_info().key);
        post.profile = *ctx.accounts.profile.to_account_info().key;
        Ok(())
    }

    pub fn initialize_connection(ctx: Context<InitializeConnection>) -> Result<()> {
        let connection = &mut ctx.accounts.connection;
        connection.bump = *ctx.bumps.get("connection").unwrap();
        connection.profile = *ctx.accounts.profile.to_account_info().key;
        connection.authority = *ctx.accounts.authority.to_account_info().key;
        Ok(())
    }

    pub fn close_connection(_ctx: Context<CloseConnection>) -> Result<()> {
        Ok(())
    }
}

#[error_code]
pub enum PostError {
    URITooLarge,
}
