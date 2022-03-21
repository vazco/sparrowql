import { buildSchema, parse, graphql, GraphQLResolveInfo } from 'graphql';
import { astToOptions, astToPipeline } from 'sparrowql-graphql';
import { v1 as uuid } from 'uuid';

const schemaSourceNonNullableRelation = `
  directive @collection(name: String!) on OBJECT
  directive @relationTo(local: String!, foreign: String!, as: String) on FIELD_DEFINITION

  type Blog @collection(name: "Blogs") {
    _id: ID!
    owner: User! @relationTo(local: "ownerId", foreign: "_id", as: "Owners")
    topic: String!
  }

  type Post @collection(name: "Posts") {
    _id: ID!
    author: User! @relationTo(local: "authorId", foreign: "_id", as: "Authors")
    # "as" defaults to collection name
    blog: Blog! @relationTo(local: "blogId", foreign: "_id")
    title: String!
  }

  type User @collection(name: "Users") {
    _id: ID!
    about: String!
    name: String!
  }

  type Query {
    posts: [Post!]!
  }
`;

const schemaSourceNullableRelation = `
  directive @collection(name: String!) on OBJECT
  directive @relationTo(local: String!, foreign: String!, as: String) on FIELD_DEFINITION

  type Blog @collection(name: "Blogs") {
    _id: ID!
    owner: User @relationTo(local: "ownerId", foreign: "_id", as: "Owners")
    topic: String!
  }

  type Post @collection(name: "Posts") {
    _id: ID!
    author: User @relationTo(local: "authorId", foreign: "_id", as: "Authors")
    # "as" defaults to collection name
    blog: Blog @relationTo(local: "blogId", foreign: "_id")
    title: String!
  }

  type User @collection(name: "Users") {
    _id: ID!
    about: String!
    name: String!
}

  type Query {
    posts: [Post!]!
  }
`;

[schemaSourceNonNullableRelation, schemaSourceNullableRelation].forEach(
  schemaSource =>
    testWithNCollections(
      'demo',
      [uuid(), uuid(), uuid()] as const,
      async (Blogs, Posts, Users) => {
        const blogs = [
          { _id: 0, ownerId: 3, topic: 'Best blog!' }, // prettier ignore
        ];

        const posts = [
          { _id: 0, authorId: 0, blogId: 0, title: 'Being fast for dummies' },
          {
            _id: 1,
            authorId: 0,
            blogId: 0,
            title: 'Being declarative for dummies',
          },
          { _id: 2, authorId: 1, blogId: 0, title: 'Amazing!' },
          { _id: 3, authorId: 2, blogId: 0, title: 'A sparrow, really?' },
        ];

        const users = [
          {
            _id: 0,
            name: 'SparrowQL',
            about: 'Declarative MongoDB aggregations',
          },
          { _id: 1, name: 'Random #1', about: 'Node.js developer' },
          { _id: 2, name: 'Random #2', about: 'Bird lover' },
          { _id: 3, name: 'BlogOwner', about: 'Owner of the only blog here' },
        ];

        await Blogs.insertMany(blogs);
        await Posts.insertMany(posts);
        await Users.insertMany(users);

        const options = astToOptions(parse(schemaSource));
        const order = (a: unknown, b: unknown) =>
          JSON.stringify(a).localeCompare(JSON.stringify(b));
        options.collections.sort(order);
        options.relations.sort(order);

        expect(options).toEqual({
          collections: ['Blogs', 'Posts', 'Users'],
          relations: [
            { foreign: '_id', from: 'Blogs', local: 'ownerId', to: 'Owners' },
            { foreign: '_id', from: 'Posts', local: 'authorId', to: 'Authors' },
            { foreign: '_id', from: 'Posts', local: 'blogId', to: 'Blogs' },
          ],
          typeMap: {
            'Blog.owner': 'Owners',
            'Post.author': 'Authors',
            'Post.blog': 'Blogs',
            'Query.posts': 'Posts',
          },
        });

        const schema = buildSchema(schemaSource);

        const resolver = {
          posts(args: unknown, context: unknown, info: GraphQLResolveInfo) {
            const pipeline = astToPipeline(info, {
              ...options,
              aliases: {
                Authors: Users.collectionName,
                Blogs: Blogs.collectionName,
                Posts: Posts.collectionName,
                Owners: Users.collectionName,
              },
              start: 'Posts',
            });

            return Posts.aggregate(pipeline).toArray();
          },
        };

        const evaluate = (query: string) => graphql(schema, query, resolver);

        await expect(
          evaluate('{ posts { blog { topic } title } }'),
        ).resolves.toEqual({
          data: {
            posts: [
              {
                blog: { topic: 'Best blog!' },
                title: 'Being fast for dummies',
              },
              {
                blog: { topic: 'Best blog!' },
                title: 'Being declarative for dummies',
              },
              { blog: { topic: 'Best blog!' }, title: 'Amazing!' },
              { blog: { topic: 'Best blog!' }, title: 'A sparrow, really?' },
            ],
          },
        });

        await expect(
          evaluate('{ posts { author { name } blog { owner { name } } } }'),
        ).resolves.toEqual({
          data: {
            posts: [
              {
                author: { name: 'SparrowQL' },
                blog: { owner: { name: 'BlogOwner' } },
              },
              {
                author: { name: 'SparrowQL' },
                blog: { owner: { name: 'BlogOwner' } },
              },
              {
                author: { name: 'Random #1' },
                blog: { owner: { name: 'BlogOwner' } },
              },
              {
                author: { name: 'Random #2' },
                blog: { owner: { name: 'BlogOwner' } },
              },
            ],
          },
        });
      },
    ),
);
