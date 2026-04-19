import { useReducer } from 'react';
import { getSenderAddress } from '../utils/stacks';
import { useSessionSync } from './useSessionSync';

export function useSenderAddress() {
    const [, forceUpdate] = useReducer((value) => value + 1, 0);

    useSessionSync(forceUpdate);

    return getSenderAddress();
}
