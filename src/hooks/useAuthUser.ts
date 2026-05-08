import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { subscribeAuth } from '../services/authService';

export const useAuthUser = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeAuth((nextUser) => {
      setUser(nextUser);
      setIsAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  return { user, isAuthLoading };
};
