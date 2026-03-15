const STANDARD_ADDRESS_REGEX = /^(SP|SM|ST)[0-9A-Z]{33,39}$/i;
const CONTRACT_PRINCIPAL_REGEX = /^(SP|SM|ST)[0-9A-Z]{33,39}\.[a-zA-Z][a-zA-Z0-9-_]{0,127}$/i;

export function isValidStacksAddress(value) {
    if (!value) return false;
    const trimmed = value.trim();
    return STANDARD_ADDRESS_REGEX.test(trimmed);
}

export function isContractPrincipal(value) {
    if (!value) return false;
    const trimmed = value.trim();
    return CONTRACT_PRINCIPAL_REGEX.test(trimmed);
}

export function isValidStacksPrincipal(value) {
    return isValidStacksAddress(value) || isContractPrincipal(value);
}
