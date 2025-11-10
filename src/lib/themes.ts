export type ThemeType = 
  | 'light'
  | 'dark';

export interface Theme {
  name: ThemeType;
  displayName: string;
  backgroundColor?: string;
  gradient?: string;
  pattern?: string;
  isDark: boolean;
}

export const themes: Record<ThemeType, Theme> = {
  'light': {
    name: 'light',
    displayName: 'Light',
    backgroundColor: '#ffffff',
    isDark: false,
  },
  'dark': {
    name: 'dark',
    displayName: 'Dark',
    backgroundColor: '#1a1a1a',
    isDark: true,
  },
};

export function getThemeTextColor(theme: ThemeType): string {
  return themes[theme].isDark ? '#ffffff' : '#000000';
}

export function getThemeGlassStyle(theme: ThemeType) {
  const isDark = themes[theme].isDark;
  return {
    background: isDark 
      ? 'rgba(255, 255, 255, 0.05)' 
      : 'rgba(255, 255, 255, 0.7)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: isDark 
      ? '1px solid rgba(255, 255, 255, 0.1)' 
      : '1px solid rgba(0, 0, 0, 0.1)',
  };
}

export function getLiquidGlassStyle(theme: ThemeType) {
  const isDark = themes[theme].isDark;
  return {
    background: isDark
      ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)'
      : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: isDark
      ? '1px solid rgba(255, 255, 255, 0.15)'
      : '1px solid rgba(0, 0, 0, 0.1)',
    boxShadow: isDark
      ? '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
      : '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
  };
}

export function getThemeBackground(theme: ThemeType): React.CSSProperties {
  const themeObj = themes[theme];
  
  if (themeObj.gradient) {
    return { background: themeObj.gradient };
  }
  
  if (themeObj.pattern) {
    return {
      backgroundColor: themeObj.backgroundColor,
      backgroundImage: themeObj.pattern,
      backgroundSize: '20px 20px',
    };
  }
  
  return { backgroundColor: themeObj.backgroundColor };
}

