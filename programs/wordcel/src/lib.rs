use anchor_lang::prelude::*;

mod instructions;
mod state;

pub use instructions::*;
pub use state::*;

declare_id!("v4enuof3drNvU2Y3b5m7K62hMq3QUP6qQSV2jjxAhkp");

const MAX_LEN_URI: usize = 128;
const MAX_LEN_BIO: usize = 140;

#[program]
pub mod wordcel {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, random_hash: [u8; 32]) -> Result<()> {
        let profile = &mut ctx.accounts.profile;
        profile.random_hash = random_hash;
        profile.bump = *ctx.bumps.get("profile").unwrap();
        profile.authority = *ctx.accounts.user.to_account_info().key;
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
        post.profile = *ctx.accounts.profile.to_account_info().key;
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

    pub fn comment(
        ctx: Context<Comment>,
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
        post.reply_to = Some(*ctx.accounts.reply_to.to_account_info().key);
        post.profile = *ctx.accounts.profile.to_account_info().key;
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
        subscription.profile = *ctx.accounts.profile.to_account_info().key;
        subscription.subscriber = *ctx.accounts.subscriber.to_account_info().key;
        let subscriber = &mut ctx.accounts.subscriber;
        subscriber.subscription_nonce += 1;
        Ok(())
    }

    pub fn cancel_subscription(_ctx: Context<CancelSubscription>) -> Result<()> {
        Ok(())
    }
}

#[error_code]
pub enum PostError {
    URITooLarge,
}
