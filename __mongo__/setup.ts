import { MongoClient } from 'mongodb';
// import { v1 as uuid } from 'uuid';

export default async function setup() {
  if (global.__MONGO__ !== undefined) {
    return;
  }

  const server = 'mongodb://localhost:27017/helloworld';
  const client = await waitAndConnect(server);
  const db = client.db();

  global.__MONGO__ = { client, db, server };
}

async function waitAndConnect(server: string) {
  for (let attempt = 0; attempt < 10; ++attempt) {
    try {
      return await MongoClient.connect(server);
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  }

  throw new Error('Could not connect to MongoDB.');
}
