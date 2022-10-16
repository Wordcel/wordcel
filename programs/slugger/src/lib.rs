use anchor_lang::prelude::*;
use std::mem::size_of;

use wordcel::program::Wordcel as WordcelProgram;
use wordcel::state::{Post, Profile};

declare_id!("SAbD2TPKyTd54oahjz6UEBzweXvojsRWbGB2t21gDnB");

#[program]
pub mod slugger {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, slug_hash: [u8; 32]) -> Result<()> {
        let slug = &mut ctx.accounts.slug;
        slug.slug_hash = slug_hash;
        slug.bump = *ctx.bumps.get("slug").unwrap();
        slug.authority = *ctx.accounts.authority.to_account_info().key;
        slug.post = *ctx.accounts.post.to_account_info().key;
        slug.profile = *ctx.accounts.profile.to_account_info().key;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(
    slug_hash: [u8;32],
)]

// Question: Is it safe to read bump from the account, instead of recalculating it?
// What possible attack could it open up?
// Will it allow one to post on another profile?
//
// TODO: Verify with test cases
pub struct Initialize<'info> {
    #[account(
        init,
        seeds = [
            b"slug".as_ref(),
            profile.key().as_ref(),
            &slug_hash
        ],
        bump,
        payer = authority,
        space = Slug::LEN
    )]
    pub slug: Account<'info, Slug>,
    #[account(
        owner = wordcel_program.key(),
        seeds = [
            b"post".as_ref(),
            post.random_hash.as_ref()
        ],
        seeds::program = wordcel_program.key(),
        bump = post.bump,
        has_one = profile
    )]
    pub post: Account<'info, Post>,
    #[account(
        owner = wordcel_program.key(),
        seeds = [
            b"profile".as_ref(),
            profile.random_hash.as_ref()
        ],
        seeds::program = wordcel_program.key(),
        bump = profile.bump,
        has_one = authority
    )]
    pub profile: Account<'info, Profile>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub wordcel_program: Program<'info, WordcelProgram>,
}

#[account]
#[derive(Default)]
pub struct Slug {
    slug_hash: [u8; 32],
    post: Pubkey,
    profile: Pubkey,
    bump: u8,
    authority: Pubkey,
}

impl Slug {
    pub const LEN: usize = 8 + size_of::<Self>();
}
