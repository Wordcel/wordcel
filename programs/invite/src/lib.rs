use std::mem::size_of;
use std::str::FromStr;

use anchor_lang::prelude::*;

pub const INVITE_PREFIX: &str = "invite";

declare_id!("6G5x4Es2YZYB5e4QkFJN88TrfLABkYEQpkUH5Gob9Cut");

#[program]
pub mod invite {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let invite_account = &mut ctx.accounts.invite_account;
        invite_account.bump = *ctx.bumps.get("invite_account").unwrap();
        invite_account.authority = *ctx.accounts.authority.to_account_info().key;
        Ok(())
    }

    pub fn send_invite(ctx: Context<SendInvite>) -> Result<()> {
        require!(
            ctx.accounts.invite_account.referred.len() as usize <= Invite::MAX_TO_GIVE as usize,
            InviteError::NoInvitesLeft
        );
        let to_invite_account = &mut ctx.accounts.to_invite_account;
        to_invite_account.bump = *ctx.bumps.get("to_invite_account").unwrap();
        to_invite_account.authority = *ctx.accounts.to.to_account_info().key;

        let invite_account = &mut ctx.accounts.invite_account;
        invite_account
            .referred
            .push(*ctx.accounts.to.to_account_info().key);
        Ok(())
    }
}

fn is_whitelisted(key: Pubkey) -> bool {
    let whitelisted_keys: Vec<Pubkey> = [
        // Wordcel Admin
        "8f2yAM5ufEC9WgHYdAxeDgpZqE1B1Q47CciPRZaDN3jc",
        // Shek
        "9M8NddGMCee9ETXXJTGHJHN1vDEqvasMCCirNW94nFNH",
        // Kunal
        "8kgbAgt8oedfprQ9LWekUh6rbY264Nv75eunHPpkbYGX",
        // Paarug
        "Gs3xD3V6We8H62pM9fkufKs644KWz1pts4EUn3bAR6Yb",
    ]
    .iter()
    .map(|k| Pubkey::from_str(k).unwrap())
    .collect();
    whitelisted_keys.contains(&key)
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        seeds = [
            INVITE_PREFIX.as_bytes().as_ref(),
            authority.key().as_ref()
        ],
        bump,
        payer = payer,
        space = Invite::LEN
    )]
    pub invite_account: Account<'info, Invite>,
    pub authority: SystemAccount<'info>,
    #[account(
        mut,
        constraint = is_whitelisted(payer.key())
    )]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SendInvite<'info> {
    #[account(
        mut,
        has_one = authority,
        seeds = [
            INVITE_PREFIX.as_bytes().as_ref(),
            authority.key().as_ref()
        ],
        bump = invite_account.bump
    )]
    pub invite_account: Account<'info, Invite>,
    #[account(
        init,
        seeds = [
            INVITE_PREFIX.as_bytes().as_ref(),
            to.key().as_ref()
        ],
        bump,
        payer = authority,
        space = Invite::LEN
    )]
    pub to_invite_account: Account<'info, Invite>,
    pub to: SystemAccount<'info>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(Default)]
pub struct Invite {
    pub authority: Pubkey,
    pub bump: u8,
    pub referred: Vec<Pubkey>,
}

impl Invite {
    pub const MAX_TO_GIVE: u8 = 2;
    pub const LEN: usize =
        8 + size_of::<Self>() + (Self::MAX_TO_GIVE as usize * size_of::<Pubkey>());
}

#[error_code]
pub enum InviteError {
    NoInvitesLeft,
}
