# Cypress Test Framework

A clean and simple Cypress + TypeScript + Cucumber test automation framework.

## 🎯 Features

- **Cypress 15.3.0** - Modern E2E testing
- **TypeScript** - Type safety without `any` types
- **Cucumber/Gherkin** - BDD approach with clear scenarios
- **Real App Testing** - Tests against cypress-realworld-app
- **Clean Architecture** - Simple, maintainable code structure

## 📁 Project Structure

```
cypress/
├── e2e/
│   ├── features/examples/
│   │   ├── api/                    # API test scenarios
│   │   │   ├── login.feature
│   │   │   ├── users.feature
│   │   │   └── create-user.feature
│   │   └── ui/                     # UI test scenarios
│   │       ├── login.feature
│   │       ├── navigation.feature
│   │       └── redirect.feature
│   └── step-definitions/examples/
│       ├── api/                    # API step implementations
│       └── ui/                     # UI step implementations
├── support/
│   ├── commands.ts                 # Custom Cypress commands
│   ├── core/                       # Core utilities
│   └── utilities/                  # Test data generators
└── config/
    └── local.json                  # Environment configuration
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- cypress-realworld-app running on ports 3000 (frontend) and 3001 (backend)

### Get cypress-realworld-app
Clone and run the reference application:
```bash
git clone https://github.com/cypress-io/cypress-realworld-app.git
cd cypress-realworld-app
yarn install
yarn dev
```

For more details, visit: [cypress-realworld-app](https://github.com/cypress-io/cypress-realworld-app.git)

### Installation
```bash
npm install
```

### Running Tests
```bash
# API Tests
npm run test:api

# UI Tests  
npm run test:ui

# All Tests
npm test
```

## ✅ Test Results

**API Tests (3/3 PASS)**
- ✅ Login with real user credentials
- ✅ Get users list from API
- ✅ Create new user via API

**UI Tests (3/3 PASS)**
- ✅ Successful login flow
- ✅ Navigate to user settings
- ✅ Redirect unauthenticated users

## 🔧 Configuration

Tests are configured to work with [cypress-realworld-app](https://github.com/cypress-io/cypress-realworld-app.git):
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:3001
- **Test User**: Heath93 / s3cret

The cypress-realworld-app is a payment application that demonstrates real-world usage of Cypress testing methods, patterns, and workflows. It provides a complete full-stack application with authentication, user management, and transaction features.

## 📊 Reports

Test reports are generated in:
- `cypress/reports/tailwind-html-report/` - HTML reports
- `cypress/reports/json/` - JSON reports
- `cypress/screenshots/` - Failure screenshots

## 🎨 Key Design Principles

1. **Simplicity** - No over-engineering, just what's needed
2. **Real Testing** - Tests against actual running application
3. **Type Safety** - Full TypeScript without `any` types
4. **Clean Code** - ESLint compliant, readable structure
5. **BDD Approach** - Clear Gherkin scenarios for business understanding

## 🛠️ Built With

- Cypress 15.3.0
- TypeScript 5.9.2
- @badeball/cypress-cucumber-preprocessor
- ESBuild for fast compilation
- Tailwind HTML Reporter for beautiful reports
