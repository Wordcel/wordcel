use anchor_lang::prelude::*;

use std::mem::size_of;

declare_id!("v4enuof3drNvU2Y3b5m7K62hMq3QUP6qQSV2jjxAhkp");

const MAX_LEN_URI: usize = 128;

#[program]
pub mod wordcel {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, random_hash: [u8; 32]) -> Result<()> {
        let publication = &mut ctx.accounts.publication;
        publication.random_hash = random_hash;
        publication.bump = *ctx.bumps.get("publication").unwrap();
        publication.authority = *ctx.accounts.user.to_account_info().key;
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
        post.publication = *ctx.accounts.publication.to_account_info().key;
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

    pub fn initialize_subscriber(ctx: Context<InitializeSubscriber>) -> Result<()> {
        let subscriber = &mut ctx.accounts.subscriber;
        subscriber.bump = *ctx.bumps.get("subscriber").unwrap();
        subscriber.authority = *ctx.accounts.user.to_account_info().key;
        Ok(())
    }

    pub fn initialize_subscription(ctx: Context<InitializeSubscription>) -> Result<()> {
        let subscription = &mut ctx.accounts.subscription;
        subscription.bump = *ctx.bumps.get("subscription").unwrap();
        subscription.publication = *ctx.accounts.publication.to_account_info().key;
        subscription.subscriber = *ctx.accounts.subscriber.to_account_info().key;
        let subscriber = &mut ctx.accounts.subscriber;
        subscriber.subscription_nonce += 1;
        Ok(())
    }

    pub fn cancel_subscription(_ctx: Context<CancelSubscription>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(random_hash: [u8;32])]
pub struct Initialize<'info> {
    #[account(init, seeds=[b"publication".as_ref(), &random_hash], bump, payer=user, space=Publication::LEN)]
    publication: Account<'info, Publication>,
    #[account(mut)]
    user: Signer<'info>,
    system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(metadata_uri: String, random_hash: [u8;32])]
pub struct CreatePost<'info> {
    #[account(mut, has_one=authority, seeds=[b"publication".as_ref(), &publication.random_hash], bump=publication.bump)]
    // Checks if a publication was supplied and if the publication authority is the signer
    publication: Account<'info, Publication>,
    #[account(init, seeds=[b"post".as_ref(), &random_hash], bump, payer=authority, space=Post::LEN)]
    post: Account<'info, Post>,
    #[account(mut)]
    authority: Signer<'info>,
    system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(metadata_uri: String)]
pub struct UpdatePost<'info> {
    #[account(mut, has_one=authority, seeds=[b"publication".as_ref(), &publication.random_hash], bump=publication.bump)]
    // Checks if the original publication was supplied and if the publication authority is the signer
    // What happens if they change the publication to a publication owned by the user.
    publication: Account<'info, Publication>,
    #[account(mut, has_one=publication, seeds=[b"post".as_ref(), &post.random_hash], bump=post.bump,)]
    // Checks if a post was supplied and it is part of the supplied publication.
    // What happens if they replace the post account with another post in the same publication
    post: Account<'info, Post>,
    #[account(mut)]
    authority: Signer<'info>,
    system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeSubscriber<'info> {
    #[account(init, seeds=[b"subscriber".as_ref(), user.key().as_ref()],bump, payer=user, space = Subscriber::LEN)]
    subscriber: Account<'info, Subscriber>,

    #[account(mut)]
    user: Signer<'info>,
    system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeSubscription<'info> {
    #[account(mut, has_one=authority)]
    subscriber: Account<'info, Subscriber>,
    #[account(init, seeds=[b"subscription".as_ref(), subscriber.key().as_ref(), &[subscriber.subscription_nonce as u8].as_ref()], bump, payer=authority, space=Subscription::LEN)]
    subscription: Account<'info, Subscription>,
    publication: Account<'info, Publication>,
    #[account(mut)]
    authority: Signer<'info>,
    system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelSubscription<'info> {
    #[account(mut, has_one=authority)]
    subscriber: Account<'info, Subscriber>,
    #[account(mut, close=authority)]
    subscription: Account<'info, Subscription>,
    authority: Signer<'info>,
    system_program: Program<'info, System>,
}

#[account]
#[derive(Default)]
pub struct Publication {
    authority: Pubkey,
    bump: u8,
    random_hash: [u8; 32],
}

impl Publication {
    const LEN: usize = 8 + size_of::<Self>();
}

#[account]
#[derive(Default)]
pub struct Post {
    publication: Pubkey,
    metadata_uri: String,
    bump: u8,
    random_hash: [u8; 32],
}

impl Post {
    const LEN: usize = 8 // Account Discriminator
        + 32 // publication
        + 32 // random_has
        + 1 // bump
        + MAX_LEN_URI;
}

#[account]
#[derive(Default)]
pub struct Subscriber {
    authority: Pubkey,
    subscription_nonce: u8,
    bump: u8,
}

impl Subscriber {
    const LEN: usize = 8 + size_of::<Self>();
}

#[account]
#[derive(Default)]
pub struct Subscription {
    publication: Pubkey,
    subscriber: Pubkey,
    bump: u8,
}

impl Subscription {
    const LEN: usize = 8 + size_of::<Self>();
}

#[error_code]
pub enum PostError {
    URITooLarge,
}
