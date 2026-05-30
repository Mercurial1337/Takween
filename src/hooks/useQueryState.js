'use client';

import { useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export function useQueryState(key, defaultValue = '') {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const value = searchParams.get(key) ?? defaultValue;

  const setValue = useCallback(
    (newValue) => {
      const params = new URLSearchParams(searchParams.toString());

      if (newValue === defaultValue || newValue === '' || newValue == null) {
        params.delete(key);
      } else {
        params.set(key, newValue);
      }

      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [key, defaultValue, router, pathname, searchParams]
  );

  return [value, setValue];
}

export function useQueryUpdater() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return useCallback(
    (updates, defaults = {}) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, val] of Object.entries(updates)) {
        const def = defaults[key] ?? '';
        if (val === def || val === '' || val == null) {
          params.delete(key);
        } else {
          params.set(key, val);
        }
      }

      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams]
  );
}
