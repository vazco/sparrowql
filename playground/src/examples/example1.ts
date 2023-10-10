export const example1 = `const projection = {
  blogTopic: 'Blogs.topic',
  postTitle: 'Posts.title',
};

const relations = [
  { to: 'Blogs', from: 'Posts', foreign: '_id', local: 'blogId' },
  { to: 'Users', from: 'Blogs', foreign: '_id', local: 'ownerId' },
  { to: 'Users', from: 'Posts', foreign: '_id', local: 'authorId' },
];

const start = 'Posts';
`;
