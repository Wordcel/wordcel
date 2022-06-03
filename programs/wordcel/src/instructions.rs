use crate::*;
use invite::program::Invite as InvitationProgram;
use invite::{Invite, INVITE_PREFIX};

#[derive(Accounts)]
#[instruction(random_hash: [u8;32])]
pub struct Initialize<'info> {
    #[account(
        init,
        seeds = [
            b"profile".as_ref(),
            &random_hash
        ],
        bump,
        payer = user,
        space = Profile::LEN
    )]
    pub profile: Account<'info, Profile>,
    #[account(
        owner = invitation_program.key(),
        seeds = [
            INVITE_PREFIX.as_bytes().as_ref(),
            user.key().as_ref()
        ],
        seeds::program = invitation_program.key(),
        bump = invitation.bump
    )]
    pub invitation: Account<'info, Invite>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub invitation_program: Program<'info, InvitationProgram>,
}

#[derive(Accounts)]
#[instruction(metadata_uri: String, random_hash: [u8;32])]
pub struct CreatePost<'info> {
    #[account(
        has_one = authority,
        seeds = [
            b"profile".as_ref(),
            &profile.random_hash
        ],
        bump = profile.bump
    )]
    // Checks if a profile was supplied and if the profile authority is the signer
    pub profile: Account<'info, Profile>,
    #[account(
        init,
        seeds = [
            b"post".as_ref(),
            &random_hash
        ],
        bump,
        payer = authority,
        space = Post::LEN
    )]
    pub post: Account<'info, Post>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(metadata_uri: String)]
pub struct UpdatePost<'info> {
    #[account(
        has_one = authority,
        seeds = [
            b"profile".as_ref(),
            &profile.random_hash
        ],
        bump = profile.bump
    )]
    // Checks if the original profile was supplied and if the profile authority is the signer
    pub profile: Account<'info, Profile>,
    #[account(
        mut,
        has_one = profile,
        seeds = [
            b"post".as_ref(),
            &post.random_hash
        ],
        bump = post.bump
    )]
    // Checks if a post was supplied and it is part of the supplied profile.
    pub post: Account<'info, Post>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(metadata_uri: String, random_hash: [u8;32])]
pub struct Comment<'info> {
    #[account(
        has_one = authority,
        seeds = [
            b"profile".as_ref(),
            &profile.random_hash
        ],
        bump = profile.bump
    )]
    // Checks if a profile was supplied and if the profile authority is the signer
    pub profile: Account<'info, Profile>,
    #[account(
        init,
        seeds = [
            b"post".as_ref(),
            &random_hash,
            reply_to.key().as_ref()
        ],
        bump,
        payer = authority,
        space = Post::LEN
    )]
    pub post: Account<'info, Post>,
    pub reply_to: Account<'info, Post>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeConnection<'info> {
    #[account(
        init,
        seeds = [
           b"connection".as_ref(),
           authority.key().as_ref(),
           profile.key().as_ref()
        ],
        bump,
        payer = authority,
        space = Connection::LEN
    )]
    pub connection: Account<'info, Connection>,
    pub profile: Account<'info, Profile>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CloseConnection<'info> {
    #[account(
        mut,
        seeds = [
           b"connection".as_ref(),
           authority.key().as_ref(),
           profile.key().as_ref()
        ],
        bump = connection.bump,
        has_one = authority,
        close = authority
    )]
    pub connection: Account<'info, Connection>,
    pub profile: Account<'info, Profile>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}
