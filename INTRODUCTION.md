### Example

First, prepare collections and some common API to query them.

```js
// Prepare two collections.
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

// Common logic for search with given projection.
const find = projection => {
    const pipeline = build({
        projection,
        relations: [{
            from: Posts.collectionName,
            to: Users.collectionName,
            foreign: '_id',
            local: 'author'
        }],
        start: Posts.collectionName
    });

    return Posts.aggregate(pipeline).toArray();
};
```

Now let's take a look at two usecases: a simple and complex one.

```js
const simple = {
    _id: 0,
    author: `${Posts.collectionName}.author`,
    title: `${Posts.collectionName}.title`
};

// [ { '$project': { _id: 0, author: '$author', title: '$title' } } ]
await expect(find(simple)).resolves.toEqual([
    {author: 0, title: 'Being fast for dummies'},
    {author: 0, title: 'Being declarative for dummies'},
    {author: 1, title: 'Amazing!'},
    {author: 2, title: 'A sparrow, really?'}
]);
```

Simple one shows, that if one collection have everything we need, it behaves in the same way as a `.find` with requested parameters.

```js
const complex = {
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
await expect(find(complex)).resolves.toEqual([
    {author: 'SparrowQL', title: 'Being fast for dummies'},
    {author: 'SparrowQL', title: 'Being declarative for dummies'},
    {author: 'Random #1', title: 'Amazing!'},
    {author: 'Random #2', title: 'A sparrow, really?'}
]);
```

Complex one shows, that if we need data from multiple collections, it automatically joins them using `$lookup` and returns only specified fields.
