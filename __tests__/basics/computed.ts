import { build, makeComputed } from 'sparrowql';
import { v1 as uuid } from 'uuid';

describe('computed', () => {
  testWithNCollections('should work', [uuid()] as const, async collectionA => {
    const docs = [
      { i: 'spam', n: NaN },
      { i: 'idintifier-1', n: 1 },
      { i: 'idintifier-1', n: 2 },
      { i: 'idintifier-2', n: 3 },
      { i: 'idintifier-2', n: 4 },
      { i: 'idintifier-3', n: 5 },
      { i: 'idintifier-3', n: 6 },
    ];

    await collectionA.insertMany(docs);

    const pipeline = build({
      computed: {
        stats: {
          required: [
            `${collectionA.collectionName}.i`,
            `${collectionA.collectionName}.n`,
          ],
          result: ['sum'],
          perform: relative => ({
            _id: relative(`${collectionA.collectionName}.i`, true),
            sum: { $sum: '$n' },
          }),
        },
      },
      sort: { [makeComputed('stats.sum')]: 1 },
      query: { [`${collectionA.collectionName}.i`]: { $ne: 'spam' } },
      start: collectionA.collectionName,
    });

    await expect(collectionA.aggregate(pipeline).toArray()).resolves.toEqual([
      { _id: 'idintifier-1', sum: 3 },
      { _id: 'idintifier-2', sum: 7 },
      { _id: 'idintifier-3', sum: 11 },
    ]);
  });

  testWithNCollections(
    'should work (mapper)',
    [uuid()] as const,
    async collectionA => {
      const docs: { x?: string; y?: string }[] = [{ x: uuid() }];

      await collectionA.insertMany(docs);

      docs.forEach(doc => {
        doc.y = doc.x;
        delete doc.x;
      });

      const pipeline = build({
        computed: {
          mapper: {
            mapper: true,
            required: [
              `${collectionA.collectionName}.i`,
              `${collectionA.collectionName}.n`,
            ],
            result: ['y'],
            perform: relative => ({
              _id: relative(`${collectionA.collectionName}._id`, true),
              y: relative(`${collectionA.collectionName}.x`, true),
            }),
          },
        },
        sort: { [makeComputed('mapper.y')]: 1 },
        start: collectionA.collectionName,
      });

      await expect(collectionA.aggregate(pipeline).toArray()).resolves.toEqual(
        docs,
      );
    },
  );
});
