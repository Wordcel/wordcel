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
