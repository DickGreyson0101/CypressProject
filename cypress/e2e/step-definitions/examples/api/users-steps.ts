import { When, Then } from '@badeball/cypress-cucumber-preprocessor';
import { UserApiService } from '@support/services/api/user-api.service';
import { UsersListResponse } from '@support/models/api/user.model';

let userApiService: UserApiService;
let usersResponse: UsersListResponse;

// Login step is in common-steps.ts

When('I request the users list', () => {
  userApiService = new UserApiService();
  userApiService.getUsers().then((response) => {
    usersResponse = response;
  });
});

Then('I should get a list of users', () => {
  expect(usersResponse).to.exist;
  expect(usersResponse.results).to.be.an('array');
  expect(usersResponse.results.length).to.be.greaterThan(0);
});

Then('each user should have required fields', () => {
  const firstUser = usersResponse.results[0];
  expect(firstUser).to.have.property('id');
  expect(firstUser).to.have.property('username');
  expect(firstUser).to.have.property('firstName');
});
