export const example2 = `const aliases = {
    'owners': 'users',
    'employees': 'users'
}

const relations = [
    { from: 'employments', local: 'salonId', to: 'salons', foreign: '_id'},
    { from: 'salons', local: 'business_id', to: 'businesses', foreign: '_id'},
    { from: 'businesses', local: 'owner_id', to: 'owners', foreign: '_id'},
    { from: 'employments', local: 'userId', to: 'employees', foreign: '_id'},
];

const start = 'employments';

const projection = {
    salonName: 'salons.name',
    employee: 'employees.first_name',
    employer: 'owners.first_name'
  };`;
