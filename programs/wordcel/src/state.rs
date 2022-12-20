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

    //Comments are just replies
    pub reply_to: Option<Pubkey>,
}

impl Post {
    pub const LEN: usize = 8 + 32 + size_of::<Self>() + MAX_LEN_URI;
}

#[account]
#[derive(Default)]
pub struct Connection {
    pub profile: Pubkey,
    pub authority: Pubkey,
    pub bump: u8,
}

impl Connection {
    pub const LEN: usize = 8 + size_of::<Self>();
}

#[account]
#[derive(Default)]
pub struct Editor {
    pub host_profile: Pubkey,
    pub editor_profile: Pubkey,
    pub bump: u8,
}

impl Editor {
    pub const LEN: usize = 8 + size_of::<Self>();
}
