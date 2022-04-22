export default async function teardown() {
  if (global.__MONGO__ === undefined) {
    return;
  }

  await global.__MONGO__.db.dropDatabase();
  await global.__MONGO__.client.close();

  global.__MONGO__ = undefined;
}
