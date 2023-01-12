use anchor_lang::prelude::*;

mod error;
mod events;
mod instructions;
mod state;

use error::*;
use events::*;
use instructions::*;
use state::*;

#[cfg(not(any(feature = "mainnet", feature = "devnet")))]
declare_id!("6bxpSrHAc9zoWHKLJX3sfudTarFaHZoKQbM2XsyjJpMF");

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
        require!(metadata_uri.len() < MAX_LEN_URI, PostError::URITooLarge);

        let post = &mut ctx.accounts.post;
        post.random_hash = random_hash;
        post.bump = *ctx.bumps.get("post").unwrap();
        post.metadata_uri = metadata_uri;
        post.profile = *ctx.accounts.profile.to_account_info().key;
        let clock = Clock::get()?;

        emit!(NewPost {
            post: *ctx.accounts.post.to_account_info().key,
            profile: *ctx.accounts.profile.to_account_info().key,
            created_at: clock.unix_timestamp
        });

        Ok(())
    }

    pub fn update_post(ctx: Context<UpdatePost>, metadata_uri: String) -> Result<()> {
        require!(metadata_uri.len() < MAX_LEN_URI, PostError::URITooLarge);

        let post = &mut ctx.accounts.post;
        post.metadata_uri = metadata_uri;
        Ok(())
    }

    pub fn comment(
        ctx: Context<Comment>,
        metadata_uri: String,
        random_hash: [u8; 32],
    ) -> Result<()> {
        require!(metadata_uri.len() < MAX_LEN_URI, PostError::URITooLarge);

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

        let clock = Clock::get()?;

        emit!(NewFollower {
            user: *ctx.accounts.authority.to_account_info().key,
            followed: *ctx.accounts.connection.to_account_info().key,
            created_at: clock.unix_timestamp
        });

        Ok(())
    }

    pub fn close_connection(_ctx: Context<CloseConnection>) -> Result<()> {
        Ok(())
    }

    pub fn create_editor(ctx: Context<CreateEditor>) -> Result<()> {
        let editor = &mut ctx.accounts.editor;
        editor.bump = ctx.bumps["editor"];
        editor.host_profile = *ctx.accounts.host_profile.to_account_info().key;
        editor.editor_profile = *ctx.accounts.editor_profile.to_account_info().key;

        let clock = Clock::get()?;

        emit!(NewEditor {
            host_profile: *ctx.accounts.host_profile.to_account_info().key,
            editor_pda: *ctx.accounts.editor.to_account_info().key,
            editor_key: ctx.accounts.editor_profile.authority,
            created_at: clock.unix_timestamp
        });

        Ok(())
    }

    pub fn remove_editor(_ctx: Context<RemoveEditor>) -> Result<()> {
        Ok(())
    }


    pub fn create_post_as_editor(ctx: Context<CreatePostAsEditor>, metadata_uri: String, random_hash: [u8; 32]) -> Result<()> {
        require!(metadata_uri.len() < MAX_LEN_URI, PostError::URITooLarge);

        let post = &mut ctx.accounts.post;
        post.random_hash = random_hash;
        post.bump = *ctx.bumps.get("post").unwrap();
        post.metadata_uri = metadata_uri;
        post.profile = *ctx.accounts.host_profile.to_account_info().key;
        Ok(())
    }

    pub fn update_post_as_editor(ctx: Context<UpdatePostAsEditor>, metadata_uri: String) -> Result<()> {
        require!(metadata_uri.len() < MAX_LEN_URI, PostError::URITooLarge);

        let post = &mut ctx.accounts.post;
        post.metadata_uri = metadata_uri;
        Ok(())
    }

    pub fn delete_post_as_editor(_ctx: Context<DeletePostAsEditor>) -> Result<()> {
        Ok(())
    }
}
