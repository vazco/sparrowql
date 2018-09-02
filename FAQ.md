### Assumptions:
  - Every relation is valid:
    - Relation key is present.
    - Relation target is present.

### Few notes:
  - `$group:`
    - If a `$group` phase is present, no `$project` is done.
    - Multiple `$group` phases probably won't work (most of the time).
  - `$limit:`
    - Before `$project` (if any).
  - `$match:`
    - If both `$match` and `$sort` are possible in the same time, `$match` is first.
    - A `$match` phase is happening as soon as any field is available.
      - We want to sort a smallest (in terms of count, not size) possible set.
  - `$project:`
    - If `$group` phase is present, no `$project` is done.
    - Last phase (if any).
  - `$skip:`
    - Before `$project` and `$limit` (if any).
  - `$sort:`
    - If both `$match` and `$sort` are possible in the same time, `$match` is first.
    - Single `$sort` is happening as soon as all fields are available.
      - We want to sort a smallest (in terms of size, not count) possible set.

### Ideas:
  - Additional `$project` phase if `$group` present but too many fields are returned.
  - Correct handling of multiple `$group` phases.
  - Delaying `$match` up to some point (it might influence `$group` phases).
  - Make `$limit` and `$skip` happen as soon as possible without changing the result.
    - This will require a note about relation arity (one-one, one-many, many-many).
  - Make use of weights to choose "lighter" paths.
  - Mongo 3.4 possibilities:
    - `$graphLookup`
  - Mongo 3.6 possibilities:
    - extended `$lookup` usage
