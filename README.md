# wordcel

Core Protocol, comprising of on-chain programs, IDL and tests.
## Account model 
 ![worcel accounts model](https://github.com/harsh4786/wordcel/blob/master/wordcel_accounts.png)
  

## Users can

1. Create a publication
    To create a publication users have to create a profile, give a suitable name of their choice. The client calls the 
    on chain program to create a profile account and initialize it with user data.
    ```pub fn create_post(
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
    } ```
2. Create a post in a publication
   The post is created after the content gets published on Arweave, the ```create_post``` instruction is called which 
   creates the post account on-chain and stores the Arweave metadata URI.
   ``` ```
3. Update a post in a publication
4. Create a subscription
5. Use the subscription to subscribe to a publication.
6. Unsubscribe from a publication.
