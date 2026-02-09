import React, { createContext, useContext, useEffect, useState } from 'react';
import { getUserState, isSouthIndia, isWithinTimeRange } from './geoUtils';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  isLoaded: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('dark');
  const [isLoaded, setIsLoaded] = useState(false);

  const updateCSSVariables = (t: Theme) => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;
    if (t === 'light') {
      root.style.setProperty('--bg-primary', '#ffffff');
      root.style.setProperty('--text-primary', '#000000');
      root.classList.remove('dark');
    } else {
      root.style.setProperty('--bg-primary', '#0f0f0f');
      root.style.setProperty('--text-primary', '#ffffff');
      root.classList.add('dark');
    }
  };

  useEffect(() => {
    const determineTheme = async () => {
      const state = await getUserState();
      const isSouth = state ? isSouthIndia(state) : false;
      const isTimeMatch = isWithinTimeRange();

      const selectedTheme = (isSouth && isTimeMatch) ? 'light' : 'dark';
      
      setTheme(selectedTheme);
      updateCSSVariables(selectedTheme);
      setIsLoaded(true);
    };

    
    updateCSSVariables('dark');
    determineTheme();
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, isLoaded }}>
      <div 
        style={{ 
          backgroundColor: isLoaded ? 'var(--bg-primary)' : '#0f0f0f', 
          color: isLoaded ? 'var(--text-primary)' : '#ffffff', 
          minHeight: '100vh', 
          transition: 'background-color 0.3s ease' 
        }}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};