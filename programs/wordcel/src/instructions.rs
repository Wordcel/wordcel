use crate::*;

#[derive(Accounts)]
#[instruction(random_hash: [u8;32])]
pub struct Initialize<'info> {
    #[account(init, seeds=[b"profile".as_ref(), &random_hash], bump, payer=user, space=Profile::LEN)]
    pub profile: Account<'info, Profile>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(metadata_uri: String, random_hash: [u8;32])]
pub struct CreatePost<'info> {
    #[account(has_one=authority, seeds=[b"profile".as_ref(), &profile.random_hash], bump=profile.bump)]
    // Checks if a profile was supplied and if the profile authority is the signer
    pub profile: Account<'info, Profile>,
    #[account(init, seeds=[b"post".as_ref(), &random_hash], bump, payer=authority, space=Post::LEN)]
    pub post: Account<'info, Post>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(metadata_uri: String)]
pub struct UpdatePost<'info> {
    #[account(has_one=authority, seeds=[b"profile".as_ref(), &profile.random_hash], bump=profile.bump)]
    // Checks if the original profile was supplied and if the profile authority is the signer
    pub profile: Account<'info, Profile>,
    #[account(mut, has_one=profile, seeds=[b"post".as_ref(), &post.random_hash], bump=post.bump,)]
    // Checks if a post was supplied and it is part of the supplied profile.
    pub post: Account<'info, Post>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(metadata_uri: String, random_hash: [u8;32])]
pub struct Comment<'info> {
    #[account(has_one=authority, seeds=[b"profile".as_ref(), &profile.random_hash], bump=profile.bump)]
    // Checks if a profile was supplied and if the profile authority is the signer
    pub profile: Account<'info, Profile>,
    #[account(init, seeds=[b"post".as_ref(), &random_hash, reply_to.key().as_ref()], bump, payer=authority, space=Post::LEN)]
    pub post: Account<'info, Post>,
    pub reply_to: Account<'info, Post>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeSubscriber<'info> {
    #[account(init, seeds=[b"subscriber".as_ref(), user.key().as_ref()],bump, payer=user, space = Subscriber::LEN)]
    pub subscriber: Account<'info, Subscriber>,

    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeSubscription<'info> {
    #[account(mut, has_one=authority)]
    pub subscriber: Account<'info, Subscriber>,
    #[account(init, seeds=[b"subscription".as_ref(), subscriber.key().as_ref(), &[subscriber.subscription_nonce as u8].as_ref()], bump, payer=authority, space=Subscription::LEN)]
    pub subscription: Account<'info, Subscription>,
    pub profile: Account<'info, Profile>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelSubscription<'info> {
    #[account(mut, has_one=authority)]
    pub subscriber: Account<'info, Subscriber>,
    #[account(mut, close=authority)]
    pub subscription: Account<'info, Subscription>,
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}
