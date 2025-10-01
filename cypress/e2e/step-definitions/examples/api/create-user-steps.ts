import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';
import { UserApiService } from '@support/services/api/user-api.service';
import { TestDataUtil } from '@support/utilities/test-data.util';
import { CreateUserRequest, CreateUserResponse } from '@support/models/api/user.model';

let userApiService: UserApiService;
let newUserData: CreateUserRequest;
let createUserResponse: CreateUserResponse;

// Login step is in common-steps.ts

Given('I have new user data', () => {
  userApiService = new UserApiService();
  newUserData = TestDataUtil.generateUserData();
});

When('I create a new user via API', () => {
  userApiService.createUser(newUserData).then((response) => {
    createUserResponse = response;
  });
});

Then('the user should be created successfully', () => {
  expect(createUserResponse).to.exist;
  expect(createUserResponse.user).to.exist;
});

Then('the response should contain the new user data', () => {
  expect(createUserResponse.user).to.have.property('id');
  expect(createUserResponse.user.firstName).to.eq(newUserData.firstName);
  expect(createUserResponse.user.username).to.eq(newUserData.username);
});
