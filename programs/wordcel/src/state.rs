use crate::*;
use std::mem::size_of;

pub const MAX_LEN_URI: usize = 128;

#[account]
#[derive(Default)]
pub struct Profile {
    pub authority: Pubkey,
    pub bump: u8,
    pub random_hash: [u8; 32],
}

impl Profile {
    pub const LEN: usize = 8 + size_of::<Self>();
}

#[account]
#[derive(Default)]
pub struct Post {
    pub profile: Pubkey,
    pub metadata_uri: String,
    pub bump: u8,
    pub random_hash: [u8; 32],

    // TODO:
    // Namespace created per project.
    // Potentially monetize the platform by creating artificial scarcity of namespaces.
    // namespace: Pubkey,

    //Comments are just replies
    pub reply_to: Option<Pubkey>,
    // TODO:
    //reshares are retweets or just share
    // Reply with reshare is qoute tweet
    // Resharing is very ineffective if done this way and without a reader, there is no strong
    // incentive to implement reshares yet
    // pub reshare: bool,
}

impl Post {
    pub const LEN: usize = 8 + 32 + size_of::<Self>() + MAX_LEN_URI;
}

#[account]
#[derive(Default)]
pub struct Subscriber {
    pub authority: Pubkey,
    pub subscription_nonce: u8,
    pub bump: u8,
}

impl Subscriber {
    pub const LEN: usize = 8 + size_of::<Self>();
}

#[account]
#[derive(Default)]
pub struct Subscription {
    pub profile: Pubkey,
    pub subscriber: Pubkey,
    pub bump: u8,
}

impl Subscription {
    pub const LEN: usize = 8 + size_of::<Self>();
}
