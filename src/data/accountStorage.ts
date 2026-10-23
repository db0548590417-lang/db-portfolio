let accountId = 'guest';
export function setStorageUser(id: string) { accountId = id; }
export function userStorageKey(key: string) { return accountId === 'owner' ? key : `${key}:account:${accountId}`; }
