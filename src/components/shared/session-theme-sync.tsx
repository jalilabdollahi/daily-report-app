"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";

export function SessionThemeSync() {
  const { data } = useSession();
  const { setTheme } = useTheme();

  useEffect(() => {
    const theme = data?.user?.theme;

    if (!theme) {
      return;
    }

    setTheme(theme.toLowerCase());
  }, [data?.user?.theme, setTheme]);

  return null;
}
