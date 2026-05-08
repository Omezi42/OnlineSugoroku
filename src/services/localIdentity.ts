const LOCAL_OWNER_KEY = 'online-sugoroku-local-owner-id';

export const getLocalOwnerId = () => {
  const existing = localStorage.getItem(LOCAL_OWNER_KEY);
  if (existing) return existing;
  const next = `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  localStorage.setItem(LOCAL_OWNER_KEY, next);
  return next;
};
