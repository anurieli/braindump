export type ThemeType = 
  | 'light'
  | 'gradient-purple'
  | 'gradient-ocean'
  | 'gradient-sunset'
  | 'gradient-forest'
  | 'dots-light'
  | 'dots-dark'
  | 'waves';

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
  'gradient-purple': {
    name: 'gradient-purple',
    displayName: 'Purple Dreams',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    isDark: true,
  },
  'gradient-ocean': {
    name: 'gradient-ocean',
    displayName: 'Ocean Depths',
    gradient: 'linear-gradient(135deg, #2E3192 0%, #1BFFFF 100%)',
    isDark: true,
  },
  'gradient-sunset': {
    name: 'gradient-sunset',
    displayName: 'Sunset Glow',
    gradient: 'linear-gradient(135deg, #FF6B6B 0%, #FFE66D 100%)',
    isDark: false,
  },
  'gradient-forest': {
    name: 'gradient-forest',
    displayName: 'Forest Mist',
    gradient: 'linear-gradient(135deg, #134E5E 0%, #71B280 100%)',
    isDark: true,
  },
  'dots-light': {
    name: 'dots-light',
    displayName: 'Dotted Light',
    backgroundColor: '#f8f9fa',
    pattern: 'radial-gradient(circle, #d0d0d0 1px, transparent 1px)',
    isDark: false,
  },
  'dots-dark': {
    name: 'dots-dark',
    displayName: 'Dotted Dark',
    backgroundColor: '#1a1a1a',
    pattern: 'radial-gradient(circle, #404040 1px, transparent 1px)',
    isDark: true,
  },
  'waves': {
    name: 'waves',
    displayName: 'Wave Pattern',
    backgroundColor: '#e0f2fe',
    pattern: 'repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(59, 130, 246, 0.1) 35px, rgba(59, 130, 246, 0.1) 70px)',
    isDark: false,
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

