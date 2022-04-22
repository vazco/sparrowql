import { build } from 'sparrowql';
import { v1 as uuid } from 'uuid';

describe('relations', () => {
  testWithNCollections(
    'should work',
    [uuid(), uuid()] as const,
    async (collectionA, collectionB) => {
      const docsA = [{ _id: 0, x: uuid(), y: uuid() }];
      const docsB = [{ _id: 0, x: uuid(), y: uuid() }];

      await collectionA.insertMany(docsA);
      await collectionB.insertMany(docsB);

      const pipeline = build({
        projection: {
          x: `${collectionB.collectionName}.x`,
          y: `${collectionB.collectionName}.y`,
        },
        relations: [
          {
            weight: 1,
            from: collectionA.collectionName,
            to: collectionB.collectionName,
            foreign: '_id',
            local: '_id',
          },
        ],
        start: collectionA.collectionName,
      });

      await expect(collectionA.aggregate(pipeline).toArray()).resolves.toEqual(
        docsB,
      );
    },
  );

  testWithNCollections(
    'should fail without path',
    [uuid(), uuid()] as const,
    async (collectionA, collectionB) => {
      const docsA = [{ _id: 0, x: uuid(), y: uuid() }];
      const docsB = [{ _id: 0, x: uuid(), y: uuid() }];

      await collectionA.insertMany(docsA);
      await collectionB.insertMany(docsB);

      expect(() =>
        build({
          projection: {
            x: `${collectionB.collectionName}.x`,
            y: `${collectionB.collectionName}.y`,
          },
          relations: [
            {
              weight: 1,
              from: collectionB.collectionName,
              to: collectionB.collectionName,
              foreign: 'aId',
              local: '_id',
            },
          ],
          start: collectionA.collectionName,
        }),
      ).toThrowError(/no way to connect/);
    },
  );

  testWithNCollections(
    'should fail without target',
    [uuid(), uuid()] as const,
    async (collectionA, collectionB) => {
      const docsA = [{ _id: 0, x: uuid(), y: uuid() }];
      const docsB = [{ _id: 0, x: uuid(), y: uuid() }];

      await collectionA.insertMany(docsA);
      await collectionB.insertMany(docsB);

      expect(() =>
        build({
          projection: {
            x: `${collectionB.collectionName}.x`,
            y: `${collectionB.collectionName}.y`,
          },
          start: collectionA.collectionName,
        }),
      ).toThrowError(/no way to connect/);
    },
  );

  testWithNCollections(
    'should return correct data for collection name being the prefix of other collection name',
    ['x', 'xs'] as const,
    async (collectionA, collectionB) => {
      const docsA = [{ _id: 0, x: uuid(), y: uuid() }];
      const docsB = [{ _id: 0, x: uuid(), y: uuid() }];

      await collectionA.insertMany(docsA);
      await collectionB.insertMany(docsB);

      const pipeline = build({
        projection: {
          x: `${collectionB.collectionName}.x`,
          y: `${collectionB.collectionName}.y`,
        },
        relations: [
          {
            weight: 1,
            from: collectionA.collectionName,
            to: collectionB.collectionName,
            foreign: '_id',
            local: '_id',
          },
        ],
        start: collectionA.collectionName,
      });
      await expect(collectionA.aggregate(pipeline).toArray()).resolves.toEqual(
        docsB,
      );
    },
  );
});
