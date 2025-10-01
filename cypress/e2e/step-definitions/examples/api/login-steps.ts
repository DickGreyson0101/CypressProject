import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';
import { UserApiService } from '@support/services/api/user-api.service';
import { TestDataUtil } from '@support/utilities/test-data.util';
import { LoginRequest, LoginResponse } from '@support/models/api/user.model';

let userApiService: UserApiService;
let testUser: LoginRequest;
let loginResponse: LoginResponse;

Given('I have a valid user from database', () => {
  userApiService = new UserApiService();
  const configUser = TestDataUtil.getUserFromConfig('admin');
  
  testUser = {
    username: configUser.username,
    password: configUser.password
  };
});

When('I login via API', () => {
  userApiService.login(testUser).then((response) => {
    loginResponse = response;
  });
});

Then('I should get a successful response', () => {
  expect(loginResponse).to.exist;
  expect(loginResponse.user).to.exist;
});

Then('the response should contain user data', () => {
  expect(loginResponse.user).to.have.property('id');
  expect(loginResponse.user).to.have.property('username');
  expect(loginResponse.user.username).to.eq(testUser.username);
});
