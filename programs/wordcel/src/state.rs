use crate::*;
use std::mem::size_of;

#[account]
#[derive(Default)]
pub struct Profile {
    pub authority: Pubkey,
    pub bump: u8,
    // Is it better to off load the metadata into its own PDA?
    pub metadata: ProfileMetadata,
    pub random_hash: [u8; 32],
}

impl Profile {
    pub const LEN: usize = 8 + size_of::<Self>() + MAX_LEN_BIO;
}

#[derive(Default, Clone, AnchorSerialize, AnchorDeserialize)]
pub struct ProfileMetadata {
    name_service: Pubkey, // Use the right anchor stub as type
    pfp_nft_mint_address: Pubkey,
    bio: Bio,
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct Bio {
    data: Vec<u8>,
}

impl Default for Bio {
    fn default() -> Self {
        Self {
            data: Vec::<u8>::with_capacity(MAX_LEN_BIO),
        }
    }
}

#[account]
#[derive(Default)]
pub struct Post {
    pub profile: Pubkey,
    pub metadata_uri: String,
    pub bump: u8,
    pub random_hash: [u8; 32],
    pub reply_to: Option<Pubkey>, //Comments are just replies
}

//Comments just increased the price though, it is kinda dumb that users have to pay the same thing
// for a long blogpost and a comment.
// We ideally want more people to comment, what if we create it as an independent account?
// How do we do this without complicating the datastructure?
impl Post {
    pub const LEN: usize = 8 // Account Discriminator
        + 32 // profile
        + 32 // reply_to
        + 32 // random_has
        + 1 // bump
        + MAX_LEN_URI;
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
