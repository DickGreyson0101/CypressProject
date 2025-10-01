import { Given } from '@badeball/cypress-cucumber-preprocessor';
import { UserApiService } from '@support/services/api/user-api.service';
import { TestDataUtil } from '@support/utilities/test-data.util';

Given('I am logged in via API', () => {
  const userApiService = new UserApiService();
  const configUser = TestDataUtil.getUserFromConfig('admin');
  
  userApiService.login({
    username: configUser.username,
    password: configUser.password
  }).then((response) => {
    expect(response.user).to.exist;
    // Cypress automatically handles session cookies
  });
});
