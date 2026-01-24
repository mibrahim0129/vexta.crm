"use client";

import { useEffect, useState } from "react";

const LS_KEY = "vexta:settings";

const defaults = {
  ownerName: "Owner",
  defaultContactsView: "rows",
  compactSidebar: false,
  accent: "violet",
};

export function useSettings() {
  const [settings, setSettings] = useState(defaults);

  useEffect(() => {
    function load() {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return setSettings(defaults);
      try {
        setSettings({ ...defaults, ...JSON.parse(raw) });
      } catch {
        setSettings(defaults);
      }
    }

    load();
    window.addEventListener("vexta:settings", load);
    return () => window.removeEventListener("vexta:settings", load);
  }, []);

  return settings;
}
