use anchor_lang::prelude::*;
use solana_security_txt::security_txt;
mod error;
mod events;
mod instructions;
mod state;

use error::*;
use events::*;
use instructions::*;
use state::*;

security_txt! {

    name: "Wordcel",
    project_url: "http://wordcel.club",
    contacts: "email:support@wordcel.club,discord:https://discord.gg/BXrEVwypQz",
    policy: "https://github.com/solana-labs/solana/blob/master/SECURITY.md",


    preferred_languages: "en",
    source_code: "https://github.com/Wordcel/wordcel",
    encryption: "-----BEGIN PGP PUBLIC KEY BLOCK-----
    Version: Keybase OpenPGP v2.0.76
    Comment: https://keybase.io/crypto
    
    xo0EY2o0zwEEAKtW+2UIgF9Jvr6U27xGSYPqu3CRbJgp5Q6hW2AXLo1cy0RIZYIs
    /1ttlIn4xLjY62e3mKwkqUAVVmzyVn01SFUdjKVvKyOHhwQl9PxbWclTMoSTMIsq
    IwTNy1+DJSPXc/ydWvRoFZfVIxWbTLFH6eDTA+3RsgWkff8pQ7ykNVH3ABEBAAHN
    G1dvcmRjZWwgPGluZm9Ad29yZGNlbC5jbHViPsK6BBMBCgAkBQJjajTPAhsvAwsJ
    BwMVCggCHgECF4ADFgIBAhkBBQkAAAAAAAoJEIc4+UK1eLuxWvoEAI80r9vECvzc
    UdLpeO82OrLl83dK+JtOEGJADibKtbq6pmSB78N5tq5h5gx9T7vSVQjcbcs8C9bF
    SW3ApeURK+OJxYCMgEQ4Pt2kvPWix1XoxHL28V1XyMZmxhN2bACYcVZJpS41qj9D
    QgTY7XocVJHvqzi5BcFocAL0pgitsGiUzo0EY2o0zwEEAOzkIrX5LON8Xh3auOat
    1joHd+MmDxMtupThJltkJMNOaK4v8QB3MCJlVQRuMNoJBhCtL2RhpdvrNlO7qpzX
    ghqIieYx9S0T6nxy9zzQss8u2TwKyxAsXPSqi1PKEEkOdxWTy/NJmFDa9/Mjoz06
    HVYz5O6wuI09MZTskjkdiJ6dABEBAAHCwIMEGAEKAA8FAmNqNM8FCQAAAAACGy4A
    qAkQhzj5QrV4u7GdIAQZAQoABgUCY2o0zwAKCRD7hs+YIIjMAivXA/9VmfSqa6NA
    tCKM7BjUjSloExgPM5NcVdWN5OrqY24SSwjJFvosNE5CdrIKHCFwtu778MrcOp+c
    OLLBy0Sm+VT6TzjkUj+U76Atm6OoIc6dYrl6ClQobhygCjfj54XnInZTG4+Cg46h
    1H/K8XdJnFfKa9sKCQ2X7p3qN9b6DtLATvk7A/45FEa+8yvwwtfJY9GMexiMX2oE
    dYeLeNk3LllqiXDQehEaOuJhNL2wOXU6UD75ozvj81/kj5OzsYbq7PecvJfkkn43
    m15K5N6Tao3un9WEwBoURMTanlTRh9ncLW0g9AzBS1iBhkbYt6MqJKB+JRj2+ZlB
    jc8uSC8J8GQAYdBhuM6NBGNqNM8BBACrODD/fhaCGS3HomwFejWf2g345fY0peKz
    E/c/2jKrSrl9JoUKkPOHjSHJ635FpYNVQnS1vJg5jP6Jb3SZU2FnBhhi9tvp+Qay
    3J7m4y8JQ/H9ACI4p1ZZz4X5WnSILA3+sQM/Aj6WQYkzFABLm32vINzaz1EUpJaO
    C2drr/wXZQARAQABwsCDBBgBCgAPBQJjajTPBQkAAAAAAhsuAKgJEIc4+UK1eLux
    nSAEGQEKAAYFAmNqNM8ACgkQTJHENzY+fzSs6AP+IHAzToZGw1InAzBx1YnvjHsV
    UrZb9n6LxxCR31bOl1eGcTmLFMTrEpOFbz6BpTKbbPTu34zI09vY5czmzdhMOPhQ
    Dj3KP2dq/ONVLLKhRmU5LhW2SDJDWBATv91XBesZ/GLef6Ex/tE8SV4942uw3GNM
    qjBxgGWCl0ZQzpd8+jf4TQP/SI8cs6nX6MbUA1ol3i/fBFgNjeIa7Xr0s44I9AeD
    kUK6WQMotQ/L7netr6nzMr52G1HSSLV54Bf2sEz1r1HWyikC2wvtu1cwP2pikVSf
    /t4QibWewjEoouJN11xeKvgsAuFz8A7mN0sP2/7ocM2bi2FcGNvbQRfSx3ijmGZh
    hFk=
    =ARmE
    -----END PGP PUBLIC KEY BLOCK-----"

}
#[cfg(not(any(feature = "mainnet", feature = "devnet")))]
declare_id!("v4enuof3drNvU2Y3b5m7K62hMq3QUP6qQSV2jjxAhkp");

#[cfg(feature = "devnet")]
declare_id!("D9JJgeRf2rKq5LNMHLBMb92g4ZpeMgCyvZkd7QKwSCzg");

#[cfg(feature = "mainnet")]
declare_id!("EXzAYHZ8xS6QJ6xGRsdKZXixoQBLsuMbmwJozm85jHp");

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
        let clock = Clock::get()?;

        emit!(NewPost {
            post: *ctx.accounts.post.to_account_info().key,
            profile: *ctx.accounts.profile.to_account_info().key,
            created_at: clock.unix_timestamp
        });

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

    pub fn initialize_connection(ctx: Context<InitializeConnection>) -> Result<()> {
        let connection = &mut ctx.accounts.connection;
        connection.bump = *ctx.bumps.get("connection").unwrap();
        connection.profile = *ctx.accounts.profile.to_account_info().key;
        connection.authority = *ctx.accounts.authority.to_account_info().key;

        let clock = Clock::get()?;

        emit!(NewFollower {
            user: *ctx.accounts.authority.to_account_info().key,
            followed: *ctx.accounts.connection.to_account_info().key,
            created_at: clock.unix_timestamp
        });

        Ok(())
    }

    pub fn close_connection(_ctx: Context<CloseConnection>) -> Result<()> {
        Ok(())
    }
}
