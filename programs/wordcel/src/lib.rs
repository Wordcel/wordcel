use anchor_lang::prelude::*;

declare_id!("v4enuof3drNvU2Y3b5m7K62hMq3QUP6qQSV2jjxAhkp");

#[program]
pub mod wordcel {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, publication_bump: u8) -> ProgramResult {
        let publication = &mut ctx.accounts.publication;
        publication.bump = publication_bump;
        publication.post_nonce = 0;
        publication.authority = *ctx.accounts.user.to_account_info().key;
        Ok(())
    }

    pub fn create_post(
        ctx: Context<CreatePost>,
        post_bump: u8,
        metadata_uri: String,
    ) -> ProgramResult {
        let post = &mut ctx.accounts.post;
        post.bump = post_bump;
        post.metadata_uri = metadata_uri;
        post.publication = *ctx.accounts.publication.to_account_info().key;
        let publication = &mut ctx.accounts.publication;
        publication.post_nonce += 1;
        Ok(())
    }

    pub fn update_post(ctx: Context<UpdatePost>, metadata_uri: String) -> ProgramResult {
        let post = &mut ctx.accounts.post;
        post.metadata_uri = metadata_uri;
        Ok(())
    }

    pub fn initialize_subscriber(
        ctx: Context<InitializeSubscriber>,
        subscriber_bump: u8,
    ) -> ProgramResult {
        let subscriber = &mut ctx.accounts.subscriber;
        subscriber.bump = subscriber_bump;
        subscriber.authority = *ctx.accounts.user.to_account_info().key;
        Ok(())
    }

    pub fn initialize_subscription(
        ctx: Context<InitializeSubscription>,
        subscription_bump: u8,
    ) -> ProgramResult {
        let subscription = &mut ctx.accounts.subscription;
        subscription.bump = subscription_bump;
        subscription.publication = *ctx.accounts.publication.to_account_info().key;
        subscription.subscriber = *ctx.accounts.subscriber.to_account_info().key;
        let subscriber = &mut ctx.accounts.subscriber;
        subscriber.subscription_nonce += 1;
        Ok(())
    }

    pub fn cancel_subscription(_ctx: Context<CancelSubscription>) -> ProgramResult {
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(publication_bump: u8)]
pub struct Initialize<'info> {
    #[account(init, seeds=[b"publication".as_ref(), user.key().as_ref()],bump=publication_bump, payer=user)]
    pub publication: Account<'info, Publication>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(post_bump: u8, metadata_uri: String)]
pub struct CreatePost<'info> {
    #[account(mut, has_one=authority)]
    pub publication: Account<'info, Publication>,
    #[account(init, seeds=[b"post".as_ref(), publication.key().as_ref(), &[publication.post_nonce as u8].as_ref()], bump=post_bump, payer=authority, space=256)]
    pub post: Account<'info, Post>,
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(metadata_uri: String)]
pub struct UpdatePost<'info> {
    #[account(mut, has_one=authority)]
    pub publication: Account<'info, Publication>,
    #[account(mut, has_one=publication)]
    pub post: Account<'info, Post>,
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(subscriber_bump: u8)]
pub struct InitializeSubscriber<'info> {
    #[account(init, seeds=[b"subscriber".as_ref(), user.key().as_ref()],bump=subscriber_bump, payer=user)]
    pub subscriber: Account<'info, Subscriber>,

    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(subscription_bump: u8)]
pub struct InitializeSubscription<'info> {
    #[account(mut, has_one=authority)]
    pub subscriber: Account<'info, Subscriber>,
    // Should publication be part of the seed? Are there any security implications?
    // So far only the subscriber cancel the subscription and they need to know the subscription account.
    #[account(init, seeds=[b"subscription".as_ref(), subscriber.key().as_ref(), &[subscriber.subscription_nonce as u8].as_ref()], bump=subscription_bump, payer=authority)]
    pub subscription: Account<'info, Subscription>,
    pub publication: Account<'info, Publication>,
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction()]
pub struct CancelSubscription<'info> {
    #[account(mut, has_one=authority)]
    pub subscriber: Account<'info, Subscriber>,
    #[account(mut, close=authority)]
    pub subscription: Account<'info, Subscription>,
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(Default)]
pub struct Publication {
    pub bump: u8,
    pub authority: Pubkey,
    pub post_nonce: u8,
}

#[account]
#[derive(Default)]
pub struct Post {
    pub bump: u8,
    pub publication: Pubkey,
    pub metadata_uri: String,
    // pub merkle_proof: u32,
}

#[account]
#[derive(Default)]
pub struct Subscriber {
    pub bump: u8,
    pub authority: Pubkey,
    pub subscription_nonce: u8,
}

#[account]
#[derive(Default)]
pub struct Subscription {
    pub bump: u8,
    pub publication: Pubkey,
    pub subscriber: Pubkey,
}
