export const example2 = `const aliases = {
    'owners': 'users',
    'employees': 'users'
}

const relations = [
    { from: 'employments', local: 'salonId', to: 'salons', foreign: '_id'},
    { from: 'salons', local: 'businessId', to: 'businesses', foreign: '_id'},
    { from: 'businesses', local: 'ownerId', to: 'owners', foreign: '_id'},
    { from: 'employments', local: 'userId', to: 'employees', foreign: '_id'},
];

const start = 'employments';

const projection = {
    salonName: 'salons.name',
    employee: 'employees.firstName',
    employer: 'owners.firstName'
  };`;
