# wordcel

Core Protocol, comprising of on-chain programs, IDL and tests.
## Account model 
 ![worcel accounts model](https://github.com/harsh4786/wordcel/blob/master/wordcel_accounts.png)
  

## The program is modular and can be used to create generic content not limited to written content.

1. Create a publication
    To create a publication users have to create a profile, give a suitable name of their choice. The client calls the 
    [```initialize```](https://github.com/Wordcel/wordcel/blob/master/programs/wordcel/src/lib.rs#L26) ix of the on-chain program to create a profile account and initialize it with user data.
  
2. Create a post in a publication
   The post is created after the content gets published on Arweave, the [```create_post```](https://github.com/Wordcel/wordcel/blob/master/programs/wordcel/src/lib.rs#L34) instruction is called which 
   creates the post account on-chain and stores the Arweave metadata URI.
3. Update a post in a publication. The client calls the [```update_post```](https://github.com/Wordcel/wordcel/blob/master/programs/wordcel/src/lib.rs#L59) ix to update the post. The program also allows users to comment on posts via the [```comment```](https://github.com/Wordcel/wordcel/blob/master/programs/wordcel/src/lib.rs#L68) instruction
4. Create a follow action with [```create_connection```](https://github.com/Wordcel/wordcel/blob/master/programs/wordcel/src/lib.rs#L86) instruction
5. Unfollow a user by closing the same above connection see [```close_connection```](https://github.com/Wordcel/wordcel/blob/master/programs/wordcel/src/lib.rs#L103) 
