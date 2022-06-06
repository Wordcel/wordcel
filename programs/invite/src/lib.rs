use std::mem::size_of;
use std::str::FromStr;

use anchor_lang::prelude::*;

declare_id!("6G5x4Es2YZYB5e4QkFJN88TrfLABkYEQpkUH5Gob9Cut");

#[program]
pub mod invite {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let invite_account = &mut ctx.accounts.invite_account;
        invite_account.bump = *ctx.bumps.get("invite_account").unwrap();
        invite_account.authority = *ctx.accounts.authority.to_account_info().key;
        invite_account.invited_by = *ctx.accounts.payer.to_account_info().key;
        invite_account.invites_left = Invite::MAX_TO_GIVE;
        invite_account.invites_sent = 0;
        Ok(())
    }

    pub fn send_invite(ctx: Context<SendInvite>) -> Result<()> {
        let to_invite_account = &mut ctx.accounts.to_invite_account;
        to_invite_account.bump = *ctx.bumps.get("to_invite_account").unwrap();
        to_invite_account.authority = *ctx.accounts.to.to_account_info().key;
        to_invite_account.invited_by = *ctx.accounts.authority.to_account_info().key;
        to_invite_account.invites_left = Invite::MAX_TO_GIVE;
        to_invite_account.invites_sent = 0;

        let invite_account = &mut ctx.accounts.invite_account;
        invite_account.invites_sent = invite_account.invites_sent.checked_add(1).unwrap();
        invite_account.invites_left = invite_account.invites_left.checked_sub(1).unwrap();
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        seeds = [
            Invite::PREFIX.as_bytes().as_ref(),
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
        constraint = Invite::is_whitelisted(payer.key()) @InviteError::UnAuthorizedInitialization
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
            Invite::PREFIX.as_bytes().as_ref(),
            authority.key().as_ref()
        ],
        bump = invite_account.bump,
        constraint = invite_account.invites_left > 0 @InviteError::NoInvitesLeft,
    )]
    pub invite_account: Account<'info, Invite>,
    #[account(
        init,
        seeds = [
            Invite::PREFIX.as_bytes().as_ref(),
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
    pub invites_sent: u8,
    pub invites_left: u8,
    pub invited_by: Pubkey,
}

impl Invite {
    pub const PREFIX: &'static str = "invite";
    pub const MAX_TO_GIVE: u8 = 2;
    pub const LEN: usize = 8 + size_of::<Self>();

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
}

#[error_code]
pub enum InviteError {
    NoInvitesLeft,
    UnAuthorizedInitialization,
}
