use crate::*;
use invite::program::Invite as InvitationProgram;
use invite::Invite;
use std::str::FromStr;

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
            Invite::PREFIX.as_bytes().as_ref(),
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
pub struct TransferProfile<'info> {
    #[account(
        mut,
        seeds = [
            b"profile".as_ref(),
            &profile.random_hash
        ],
        bump,
    )]
    pub profile: Account<'info, Profile>,
    #[account(
        owner = invitation_program.key(),
        seeds = [
            Invite::PREFIX.as_bytes().as_ref(),
            authority.key().as_ref()
        ],
        seeds::program = invitation_program.key(),
        bump = invitation.bump
    )]
    pub invitation: Account<'info, Invite>,
    #[account(
        owner = invitation_program.key(),
        seeds = [
            Invite::PREFIX.as_bytes().as_ref(),
            new_authority.key().as_ref()
        ],
        seeds::program = invitation_program.key(),
        bump = new_authority_invitation.bump
    )]
    pub new_authority_invitation: Account<'info, Invite>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub new_authority: SystemAccount<'info>,
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
        // Don't allow the user to follow themselves
        constraint = profile.authority.key() != authority.key() @ConnectionError::SelfFollow,
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

#[derive(Accounts)]
#[instruction(random_hash: [u8; 32])]
pub struct InitializeConnectionBox<'info> {
    #[account(
        init,
        seeds = [
           b"connection_box".as_ref(),
           &random_hash
        ],
        bump,
        payer = authority,
        space = ConnectionBox::LEN
    )]
    pub connection_box: Account<'info, ConnectionBox>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct TranferConnectionBox<'info> {
    #[account(
        mut,
        seeds = [
           b"connection_box".as_ref(),
           &connection_box.random_hash
        ],
        bump,
    )]
    pub connection_box: Account<'info, ConnectionBox>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub new_authority: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeConnectionV2<'info> {
    #[account(
        init,
        seeds = [
           b"connection_v2".as_ref(),
           profile.key().as_ref()
        ],
        bump,
        payer = authority,
        // Don't allow the user to follow themselves
        constraint = profile.authority.key() != connection_box.authority.key() @ConnectionError::SelfFollow,
        space = ConnectionV2::LEN
    )]
    pub connection: Account<'info, ConnectionV2>,
    #[account(has_one=authority)]
    pub connection_box: Account<'info, ConnectionBox>,
    pub profile: Account<'info, Profile>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CloseConnectionV2<'info> {
    #[account(
        mut,
        seeds = [
           b"connection_v2".as_ref(),
           profile.key().as_ref()
        ],
        bump = connection.bump,
        has_one = connection_box,
        close = authority
    )]
    pub connection: Account<'info, ConnectionV2>,
    #[account(has_one=authority)]
    pub connection_box: Account<'info, ConnectionBox>,
    pub profile: Account<'info, Profile>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MigrateConnectionToV2<'info> {
    #[account(
        mut,
        seeds = [
           b"connection".as_ref(),
           authority.key().as_ref(),
           profile.key().as_ref()
        ],
        bump = connection_v1.bump,
        has_one = authority,
        close = authority
    )]
    pub connection_v1: Account<'info, Connection>,
    #[account(
        init,
        seeds = [
           b"connection_v2".as_ref(),
           profile.key().as_ref()
        ],
        bump,
        payer = authority,
        // Don't allow the user to follow themselves
        constraint = profile.authority.key() != connection_box.authority.key() @ConnectionError::SelfFollow,
        space = ConnectionV2::LEN
    )]
    pub connection_v2: Account<'info, ConnectionV2>,
    #[account(has_one=authority)]
    pub connection_box: Account<'info, ConnectionBox>,
    pub profile: Account<'info, Profile>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// NOTE: This instruction doesn't close the existing connection, but merely copies it over to
// connection v2.
// This is added so that the admin can easily migrate the conenctions if they chose to by paying
// for it and this helps us offer a better user experience.

#[derive(Accounts)]
#[instruction(random_hash: [u8; 32])]
pub struct MigrateConnectionToV2Admin<'info> {
    #[account(
        seeds = [
           b"connection".as_ref(),
           authority.key().as_ref(),
           profile.key().as_ref()
        ],
        bump = connection_v1.bump,
        has_one = authority,
    )]
    pub connection_v1: Account<'info, Connection>,
    #[account(
        init,
        seeds = [
           b"connection_v2".as_ref(),
           profile.key().as_ref()
        ],
        bump,
        payer = payer,
        // Don't allow the user to follow themselves
        constraint = profile.authority.key() != authority.key() @ConnectionError::SelfFollow,
        space = ConnectionV2::LEN
    )]
    pub connection_v2: Account<'info, ConnectionV2>,
    #[account(
        init,
        seeds = [
           b"connection_box".as_ref(),
           &random_hash
        ],
        bump,
        payer = payer,
        space = ConnectionBox::LEN
    )]
    pub connection_box: Account<'info, ConnectionBox>,
    pub profile: Account<'info, Profile>,
    pub authority: SystemAccount<'info>,
    #[account(mut, constraint = is_admin(payer.key()) @AdminError::UnAuthorizedAccess)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

fn is_admin(key: Pubkey) -> bool {
    let admin_keys: Vec<Pubkey> = [
        // Wordcel Admin
        "8f2yAM5ufEC9WgHYdAxeDgpZqE1B1Q47CciPRZaDN3jc",
    ]
    .iter()
    .map(|k| Pubkey::from_str(k).unwrap())
    .collect();
    admin_keys.contains(&key)
}
