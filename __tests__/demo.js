const {build} = require('sparrowql');

testWithNCollections(2, 'demo', async (Posts, Users) => {
    const posts = [
        {author: 0, title: 'Being fast for dummies'},
        {author: 0, title: 'Being declarative for dummies'},
        {author: 1, title: 'Amazing!'},
        {author: 2, title: 'A sparrow, really?'}
    ];

    const users = [
        {_id: 0, name: 'SparrowQL', about: 'Declarative MongoDB aggregations'},
        {_id: 1, name: 'Random #1', about: 'Node.js developer'},
        {_id: 2, name: 'Random #2', about: 'Bird lover'}
    ];

    await Posts.insertMany(posts);
    await Users.insertMany(users);

    const find = projection =>
        Posts.aggregate(
            build({
                projection,
                relations: [
                    {
                        from: Posts.collectionName,
                        to: Users.collectionName,
                        foreign: '_id',
                        local: 'author'
                    }
                ],
                start: Posts.collectionName
            })
        ).toArray();

    const fieldsA = {
        _id: 0,
        author: `${Posts.collectionName}.author`,
        title: `${Posts.collectionName}.title`
    };

    // [ { '$project': { _id: 0, author: '$author', title: '$title' } } ]
    await expect(find(fieldsA)).resolves.toEqual([
        {author: 0, title: 'Being fast for dummies'},
        {author: 0, title: 'Being declarative for dummies'},
        {author: 1, title: 'Amazing!'},
        {author: 2, title: 'A sparrow, really?'}
    ]);

    const fieldsB = {
        _id: 0,
        author: `${Users.collectionName}.name`,
        title: `${Posts.collectionName}.title`
    };

    // [ { '$lookup':
    //      { as: 'SPARROW_JOINED_Users',
    //        foreignField: '_id',
    //        from: 'Users',
    //        localField: 'author' } },
    //   { '$unwind':
    //      { path: '$SPARROW_JOINED_Users',
    //        preserveNullAndEmptyArrays: true } },
    //   { '$project':
    //      { _id: 0,
    //        author: '$SPARROW_JOINED_Users.name',
    //        title: '$title' } } ]
    await expect(find(fieldsB)).resolves.toEqual([
        {author: 'SparrowQL', title: 'Being fast for dummies'},
        {author: 'SparrowQL', title: 'Being declarative for dummies'},
        {author: 'Random #1', title: 'Amazing!'},
        {author: 'Random #2', title: 'A sparrow, really?'}
    ]);
});
