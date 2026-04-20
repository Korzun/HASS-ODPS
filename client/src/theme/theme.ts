export interface Theme {
  colors: {
    primary: string;
    primaryHover: string;
    primaryLight: string;
    primaryBorder: string;
    danger: string;
    success: string;
    text: {
      primary: string;
      secondary: string;
      muted: string;
      faint: string;
    };
    bg: {
      page: string;
      card: string;
      input: string;
    };
    border: string;
    borderLight: string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    pill: string;
  };
  shadows: {
    card: string;
    cover: string;
  };
}

export const defaultTheme: Theme = {
  colors: {
    primary: '#1e40af',
    primaryHover: '#1d4ed8',
    primaryLight: '#eff6ff',
    primaryBorder: '#bfdbfe',
    danger: '#dc2626',
    success: '#16a34a',
    text: {
      primary: '#111',
      secondary: '#374151',
      muted: '#6b7280',
      faint: '#9ca3af',
    },
    bg: {
      page: '#f3f4f6',
      card: '#fff',
      input: '#fff',
    },
    border: '#d1d5db',
    borderLight: '#e5e7eb',
  },
  borderRadius: {
    sm: '4px',
    md: '6px',
    lg: '8px',
    pill: '20px',
  },
  shadows: {
    card: '0 1px 3px rgba(0,0,0,.07)',
    cover: '0 2px 8px rgba(0,0,0,.15)',
  },
};
