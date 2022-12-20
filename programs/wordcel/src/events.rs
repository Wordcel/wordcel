use crate::*;

#[event]
pub struct NewPost {
    pub post: Pubkey,
    #[index]
    pub profile: Pubkey,
    pub created_at: i64,
}

#[event]
pub struct NewFollower {
    pub user: Pubkey,
    #[index]
    pub followed: Pubkey,
    pub created_at: i64,
}

#[event]
pub struct NewEditor {
    pub host_profile: Pubkey,
    pub editor_pda: Pubkey,
    #[index]
    pub editor_key: Pubkey,
    pub created_at: i64,
}
