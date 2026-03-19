import { 
  validateContractAddress, 
  validateContractName, 
  validateStacksApiUrl, 
  validateEnvironmentConfig,
  ConfigValidationError
} from './validation.js';
import { CONTRACT_ADDRESS, CONTRACT_NAME, STACKS_API_BASE, NETWORK_NAME, APP_URL } from './contracts.js';

export function validateConfigAtStartup() {
  const validationResults = {
    success: true,
    errors: [],
    warnings: []
  };

  const envValidation = validateEnvironmentConfig();
  validationResults.errors.push(...envValidation.errors);
  validationResults.warnings.push(...envValidation.warnings);

  try {
    validateContractAddress(CONTRACT_ADDRESS);
  } catch (err) {
    validationResults.errors.push(err);
  }

  try {
    validateContractName(CONTRACT_NAME);
  } catch (err) {
    validationResults.errors.push(err);
  }

  try {
    validateStacksApiUrl(STACKS_API_BASE, NETWORK_NAME);
  } catch (err) {
    validationResults.errors.push(err);
  }

  if (validationResults.errors.length > 0) {
    validationResults.success = false;
  }

  return validationResults;
}

export function reportValidationErrors(results) {
  if (results.errors.length > 0) {
    console.error('Configuration validation failed:');
    results.errors.forEach((err) => {
      if (err instanceof ConfigValidationError) {
        console.error(`  [${err.field}] ${err.message}`);
      } else {
        console.error(`  ${err.message}`);
      }
    });
  }

  if (results.warnings.length > 0) {
    results.warnings.forEach((warning) => {
      console.warn(`  ${warning}`);
    });
  }
}
