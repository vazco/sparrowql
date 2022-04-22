import { Collection, Db, MongoClient } from 'mongodb';

declare global {
  // eslint-disable-next-line no-inner-declarations, no-var
  var __MONGO__: undefined | { client: MongoClient; db: Db; server: string };

  function testWithNCollections<Names extends readonly string[]>(
    name: string,
    collections: Names,
    fn: (
      ...collections: { [_ in keyof Names]: Collection<any> }
    ) => Promise<void>,
  ): void;
}
