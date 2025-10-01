/**
 * Test Data Generator - Professional test data generation with Faker.js
 * Enhanced from New_Cypress approach with comprehensive data types
 */

import { faker } from '@faker-js/faker';
import { logger } from '@support/core/logging/test-logger';

export interface PersonData {
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: Date;
  address: AddressData;
}

export interface AddressData {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface CompanyData {
  name: string;
  industry: string;
  email: string;
  phone: string;
  website: string;
  address: AddressData;
}

export interface FinancialData {
  accountNumber: string;
  routingNumber: string;
  creditCardNumber: string;
  iban: string;
  amount: number;
  currency: string;
}

export class TestDataGenerator {
  private static instance: TestDataGenerator;
  private seed: number | undefined;

  private constructor() {}

  public static getInstance(): TestDataGenerator {
    if (!TestDataGenerator.instance) {
      TestDataGenerator.instance = new TestDataGenerator();
    }
    return TestDataGenerator.instance;
  }

  /**
   * Set seed for reproducible data generation
   */
  public setSeed(seed: number): void {
    this.seed = seed;
    faker.seed(seed);
    logger.debug(`Test data generator seed set to: ${seed}`);
  }

  /**
   * Generate random person data
   */
  public generatePerson(): PersonData {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();

    return {
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      email: faker.internet.email({ firstName, lastName }),
      phone: faker.phone.number(),
      dateOfBirth: faker.date.birthdate({ min: 18, max: 80, mode: 'age' }),
      address: this.generateAddress(),
    };
  }

  /**
   * Generate random address data
   */
  public generateAddress(): AddressData {
    return {
      street: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state(),
      zipCode: faker.location.zipCode(),
      country: faker.location.country(),
    };
  }

  /**
   * Generate random company data
   */
  public generateCompany(): CompanyData {
    const companyName = faker.company.name();

    return {
      name: companyName,
      industry: faker.company.buzzNoun(),
      email: faker.internet.email({ firstName: companyName.toLowerCase().replace(/\s+/g, '') }),
      phone: faker.phone.number(),
      website: faker.internet.url(),
      address: this.generateAddress(),
    };
  }

  /**
   * Generate financial data
   */
  public generateFinancialData(): FinancialData {
    return {
      accountNumber: faker.finance.accountNumber(),
      routingNumber: faker.finance.routingNumber(),
      creditCardNumber: faker.finance.creditCardNumber(),
      iban: faker.finance.iban(),
      amount: parseFloat(faker.finance.amount()),
      currency: faker.finance.currencyCode(),
    };
  }

  /**
   * Generate random string with specific pattern
   */
  public generateString(pattern: 'alphanumeric' | 'alpha' | 'numeric', length: number): string {
    switch (pattern) {
      case 'alphanumeric':
        return faker.string.alphanumeric(length);
      case 'alpha':
        return faker.string.alpha(length);
      case 'numeric':
        return faker.string.numeric(length);
      default:
        return faker.string.alphanumeric(length);
    }
  }

  /**
   * Generate random password with complexity requirements
   */
  public generatePassword(options?: {
    length?: number;
    includeUppercase?: boolean;
    includeLowercase?: boolean;
    includeNumbers?: boolean;
    includeSymbols?: boolean;
  }): string {
    const {
      length = 12,
      includeUppercase = true,
      includeLowercase = true,
      includeNumbers = true,
      includeSymbols = true,
    } = options || {};

    let charset = '';
    if (includeUppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (includeLowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
    if (includeNumbers) charset += '0123456789';
    if (includeSymbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';

    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    return password;
  }

  /**
   * Generate random date within range
   */
  public generateDate(from?: Date, to?: Date): Date {
    return faker.date.between({
      from: from || new Date('2020-01-01'),
      to: to || new Date(),
    });
  }

  /**
   * Generate random number within range
   */
  public generateNumber(min: number = 0, max: number = 100): number {
    return faker.number.int({ min, max });
  }

  /**
   * Generate random boolean with optional weight
   */
  public generateBoolean(trueWeight: number = 0.5): boolean {
    return faker.datatype.boolean({ probability: trueWeight });
  }

  /**
   * Generate random array of items
   */
  public generateArray<T>(generator: () => T, count?: number): T[] {
    const arrayLength = count || faker.number.int({ min: 1, max: 10 });
    return Array.from({ length: arrayLength }, generator);
  }

  /**
   * Pick random item from array
   */
  public pickRandom<T>(items: T[]): T {
    return faker.helpers.arrayElement(items);
  }

  /**
   * Pick multiple random items from array
   */
  public pickRandomMultiple<T>(items: T[], count?: number): T[] {
    const pickCount = count || faker.number.int({ min: 1, max: Math.min(items.length, 5) });
    return faker.helpers.arrayElements(items, pickCount);
  }

  /**
   * Generate unique identifier
   */
  public generateId(prefix?: string): string {
    const id = faker.string.uuid();
    return prefix ? `${prefix}_${id}` : id;
  }

  /**
   * Generate realistic test data based on data type
   */
  public generateByType(dataType: string, options?: Record<string, unknown>): unknown {
    switch (dataType.toLowerCase()) {
      case 'email':
        return faker.internet.email();
      case 'username':
        return faker.internet.username();
      case 'url':
        return faker.internet.url();
      case 'phone':
        return faker.phone.number();
      case 'name':
        return faker.person.fullName();
      case 'firstname':
        return faker.person.firstName();
      case 'lastname':
        return faker.person.lastName();
      case 'company':
        return faker.company.name();
      case 'address':
        return faker.location.streetAddress();
      case 'city':
        return faker.location.city();
      case 'country':
        return faker.location.country();
      case 'zipcode':
        return faker.location.zipCode();
      case 'date':
        return this.generateDate(options?.from as Date, options?.to as Date);
      case 'number':
        return this.generateNumber(options?.min as number, options?.max as number);
      case 'boolean':
        return this.generateBoolean(options?.trueWeight as number);
      case 'uuid':
        return faker.string.uuid();
      case 'text':
        return faker.lorem.paragraph();
      case 'word':
        return faker.lorem.word();
      case 'sentence':
        return faker.lorem.sentence();
      default:
        logger.warn(`Unknown data type: ${dataType}, generating random string`);
        return faker.string.alphanumeric(10);
    }
  }

  /**
   * Generate test data from template
   */
  public generateFromTemplate(template: Record<string, string>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, dataType] of Object.entries(template)) {
      result[key] = this.generateByType(dataType);
    }

    return result;
  }

  /**
   * Reset faker to use random seed
   */
  public resetSeed(): void {
    this.seed = undefined;
    faker.seed();
    logger.debug('Test data generator seed reset to random');
  }
}

// Export singleton instance
export const testDataGenerator = TestDataGenerator.getInstance();
