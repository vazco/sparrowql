const {build} = require('sparrowql');

testWithNCollections(3, 'demo', async (Blogs, Posts, Users) => {
    const blogs = [
        {_id: 0, ownerId: 3, topic: 'Best blog!'} // prettier ignore
    ];

    const posts = [
        {_id: 0, authorId: 0, blogId: 0, title: 'Being fast for dummies'},
        {_id: 1, authorId: 0, blogId: 0, title: 'Being declarative for dummies'},
        {_id: 2, authorId: 1, blogId: 0, title: 'Amazing!'},
        {_id: 3, authorId: 2, blogId: 0, title: 'A sparrow, really?'}
    ];

    const users = [
        {_id: 0, name: 'SparrowQL', about: 'Declarative MongoDB aggregations'},
        {_id: 1, name: 'Random #1', about: 'Node.js developer'},
        {_id: 2, name: 'Random #2', about: 'Bird lover'},
        {_id: 3, name: 'BlogOwner', about: 'Owner of the only blog here'}
    ];

    await Blogs.insertMany(blogs);
    await Posts.insertMany(posts);
    await Users.insertMany(users);

    const pipelineA = build({
        aliases: {
            Blogs: Blogs.collectionName,
            Posts: Posts.collectionName,
            Users: Users.collectionName
        },
        projection: {
            _id: 0,
            blogTopic: 'Blogs.topic',
            postTitle: 'Posts.title'
        },
        relations: [
            {to: 'Blogs', from: 'Posts', foreign: '_id', local: 'blogId'},
            {to: 'Users', from: 'Blogs', foreign: '_id', local: 'ownerId'},
            {to: 'Users', from: 'Posts', foreign: '_id', local: 'authorId'}
        ],
        start: 'Posts'
    });

    await expect(Posts.aggregate(pipelineA).toArray()).resolves.toEqual([
        {blogTopic: 'Best blog!', postTitle: 'Being fast for dummies'},
        {blogTopic: 'Best blog!', postTitle: 'Being declarative for dummies'},
        {blogTopic: 'Best blog!', postTitle: 'Amazing!'},
        {blogTopic: 'Best blog!', postTitle: 'A sparrow, really?'}
    ]);

    const pipelineB = build({
        aliases: {
            Authors: Users.collectionName,
            Blogs: Blogs.collectionName,
            Owners: Users.collectionName,
            Posts: Posts.collectionName
        },
        projection: {
            _id: 0,
            blogOwnerName: 'Owners.name',
            postTitle: 'Posts.title'
        },
        relations: [
            {to: 'Blogs', from: 'Posts', foreign: '_id', local: 'blogId'},
            {to: 'Owners', from: 'Blogs', foreign: '_id', local: 'ownerId'},
            {to: 'Authors', from: 'Posts', foreign: '_id', local: 'authorId'}
        ],
        start: 'Posts'
    });

    await expect(Posts.aggregate(pipelineB).toArray()).resolves.toEqual([
        {blogOwnerName: 'BlogOwner', postTitle: 'Being fast for dummies'},
        {blogOwnerName: 'BlogOwner', postTitle: 'Being declarative for dummies'},
        {blogOwnerName: 'BlogOwner', postTitle: 'Amazing!'},
        {blogOwnerName: 'BlogOwner', postTitle: 'A sparrow, really?'}
    ]);

    const pipelineC = build({
        aliases: {
            Authors: Users.collectionName,
            Blogs: Blogs.collectionName,
            Owners: Users.collectionName,
            Posts: Posts.collectionName
        },
        projection: {
            _id: 0,
            postTitle: 'Posts.title'
        },
        relations: [
            {to: 'Blogs', from: 'Posts', foreign: '_id', local: 'blogId'},
            {to: 'Owners', from: 'Blogs', foreign: '_id', local: 'ownerId'},
            {to: 'Authors', from: 'Posts', foreign: '_id', local: 'authorId'}
        ],
        start: 'Posts'
    });

    await expect(Posts.aggregate(pipelineC).toArray()).resolves.toEqual([
        {postTitle: 'Being fast for dummies'},
        {postTitle: 'Being declarative for dummies'},
        {postTitle: 'Amazing!'},
        {postTitle: 'A sparrow, really?'}
    ]);

    await Posts.insertMany([
        {_id: 4, authorId: 1, blogId: 0, title: 'Best!'},
        {_id: 5, authorId: 1, blogId: 0, title: 'Superb!'}
    ]);

    const pipelineD = build({
        aliases: {
            Authors: Users.collectionName,
            Blogs: Blogs.collectionName,
            Owners: Users.collectionName,
            Posts: Posts.collectionName
        },
        limit: 1,
        projection: {
            _id: 0,
            blogOwnerName: 'Owners.name',
            postAuthorName: 'Authors.name',
            postTitle: 'Posts.title'
        },
        query: {'Authors.name': 'Random #1'},
        relations: [
            {to: 'Blogs', from: 'Posts', foreign: '_id', local: 'blogId'},
            {to: 'Owners', from: 'Blogs', foreign: '_id', local: 'ownerId'},
            {to: 'Authors', from: 'Posts', foreign: '_id', local: 'authorId'}
        ],
        skip: 1,
        sort: {'Posts.title': -1},
        start: 'Posts'
    });

    await expect(Posts.aggregate(pipelineD).toArray()).resolves.toEqual([
        {
            blogOwnerName: 'BlogOwner',
            postAuthorName: 'Random #1',
            postTitle: 'Best!'
        }
    ]);
});
