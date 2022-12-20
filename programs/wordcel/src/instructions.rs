use crate::*;

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
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateEditor<'info> {
    #[account(
        init,
        seeds = [
            b"editor".as_ref(),
            host_profile.authority.key().as_ref(),
            editor_profile.authority.key().as_ref()
        ],
        bump,
        payer = authority,
        space = Editor::LEN
    )]
    pub editor: Account<'info, Editor>,
    #[account(has_one = authority)]
    pub host_profile: Account<'info, Profile>,
    pub editor_profile: Account<'info, Profile>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RemoveEditor<'info> {
    #[account(
        mut,
        seeds = [
            b"editor".as_ref(),
            host_profile.authority.key().as_ref(),
            editor_profile.authority.key().as_ref()
        ],
        bump = editor.bump,
        close = authority,
    )]
    pub editor: Account<'info, Editor>,
    #[account(has_one = authority)]
    pub host_profile: Account<'info, Profile>,
    pub editor_profile: Account<'info, Profile>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// This would prevent the editor from updating the post
// Though this is a very likely scenario.

// #[derive(Accounts)]
// pub struct PostAsEditor<'info> {
//     // Checks if the original profile was supplied and if the profile authority is the signer
//     #[account(
//         has_one = authority,
//         seeds = [
//             b"profile".as_ref(),
//             &editor_profile.random_hash
//         ],
//         bump = editor_profile.bump
//     )]
//     pub editor_profile: Account<'info, Profile>,

//     // Checks if a post was supplied and it is part of the supplied profile.
//     #[account(
//         mut,
//         constraint = post.profile == editor_profile.to_account_info().key(),
//         seeds = [
//             b"post".as_ref(),
//             &post.random_hash
//         ],
//         bump = post.bump
//     )]
//     pub post: Account<'info, Post>,

//     #[account(
//         seeds = [
//             b"profile".as_ref(),
//             &host_profile.random_hash
//         ],
//         bump = host_profile.bump
//     )]
//     pub host_profile: Account<'info, Profile>,

//     #[account(
//         has_one = host_profile,
//         seeds = [
//             b"editor".as_ref(),
//             host_profile.authority.key().as_ref(),
//             editor_profile.authority.key().as_ref()
//         ],
//         bump = editor.bump
//     )]
//     pub editor: Account<'info, Editor>,

//     #[account(mut)]
//     pub authority: Signer<'info>,

//     pub system_program: Program<'info, System>,
// }

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
