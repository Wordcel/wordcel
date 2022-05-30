use std::mem::size_of;

use anchor_lang::prelude::*;

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

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, seeds=[b"invite".as_ref(), authority.key().as_ref()], bump, payer=payer, space=Invite::LEN)]
    pub invite_account: Account<'info, Invite>,
    pub authority: SystemAccount<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SendInvite<'info> {
    #[account(mut, has_one=authority, seeds=[b"invite".as_ref(), authority.key().as_ref()], bump=invite_account.bump)]
    pub invite_account: Account<'info, Invite>,
    #[account(init, seeds=[b"invite".as_ref(), to.key().as_ref()], bump, payer=authority, space=Invite::LEN)]
    pub to_invite_account: Account<'info, Invite>,
    pub to: SystemAccount<'info>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(Default)]
pub struct Invite {
    authority: Pubkey,
    bump: u8,
    referred: Vec<Pubkey>,
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
