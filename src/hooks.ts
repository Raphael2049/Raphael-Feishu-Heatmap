import { dashboard, DashboardState } from "@lark-base-open/js-sdk";
import React, { useLayoutEffect, useState } from "react";

function updateTheme(theme: string) {
  document.body.setAttribute('theme-mode', theme);
}

/** 跟随主题色变化 */
export function useTheme() {
  const [bgColor, setBgColor] = useState('#ffffff');
  const [theme, setTheme] = useState('light');

  useLayoutEffect(() => {
    dashboard.getTheme().then((res) => {
      setBgColor(res.chartBgColor);
      setTheme(res.theme.toLowerCase());
      updateTheme(res.theme.toLowerCase());
    });

    dashboard.onThemeChange((res) => {
      setBgColor(res.data.chartBgColor);
      setTheme(res.data.theme.toLowerCase());
      updateTheme(res.data.theme.toLowerCase());
    });
  }, []);

  return { bgColor, theme };
}

/** 初始化、更新config */
export function useConfig(updateConfig: (data: any) => void) {
  const isCreate = dashboard.state === DashboardState.Create;

  React.useEffect(() => {
    if (isCreate) {
      return;
    }
    dashboard.getConfig().then(updateConfig);
  }, []);

  React.useEffect(() => {
    const offConfigChange = dashboard.onConfigChange((r) => {
      updateConfig(r.data);
    });
    return () => {
      offConfigChange();
    };
  }, []);
}