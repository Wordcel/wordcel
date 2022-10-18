# wordcel

Core Protocol, comprising of on-chain programs, IDL and tests.
## Account model
  

## Users can

1. Create a publication
    To create a publication users have to create a profile, give a suitable name of their choice. The client calls the 
    on chain program to create a profile account and initialize it with user data.
    ``` ```
2. Create a post in a publication
   The post is created after the content gets published on Arweave, the ```create_post``` instruction is called which 
   creates the post account on-chain and stores the Arweave metadata URI.
   ``` ```
3. Update a post in a publication
4. Create a subscription
5. Use the subscription to subscribe to a publication.
6. Unsubscribe from a publication.
