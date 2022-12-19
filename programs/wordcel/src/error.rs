use crate::*;

#[error_code]
pub enum PostError {
    URITooLarge,
}

#[error_code]
pub enum ConnectionError {
    SelfFollow,
}

#[error_code]
pub enum AdminError {
    UnAuthorizedAccess,
}
