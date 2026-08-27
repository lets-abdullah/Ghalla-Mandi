import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const SidebarContext = createContext();

// Breakpoint at which we switch from mobile-overlay to desktop-fixed mode
const DESKTOP_BREAKPOINT = 768; // md

export const SidebarProvider = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('gm_sidebar_collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  // Mobile drawer state — independent of desktop collapse
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Track whether we're in mobile mode
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < DESKTOP_BREAKPOINT);

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < DESKTOP_BREAKPOINT;
      setIsMobile(mobile);
      // Close mobile drawer whenever we cross to desktop
      if (!mobile) setIsMobileOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    localStorage.setItem('gm_sidebar_collapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  // Desktop collapse
  const toggleSidebar = useCallback(() => setIsCollapsed(prev => !prev), []);
  const collapseSidebar = useCallback(() => setIsCollapsed(true), []);
  const expandSidebar = useCallback(() => setIsCollapsed(false), []);

  // Mobile drawer
  const toggleMobileMenu = useCallback(() => setIsMobileOpen(prev => !prev), []);
  const openMobileMenu = useCallback(() => setIsMobileOpen(true), []);
  const closeMobileMenu = useCallback(() => setIsMobileOpen(false), []);

  return (
    <SidebarContext.Provider value={{
      isCollapsed,
      isMobile,
      isMobileOpen,
      toggleSidebar,
      collapseSidebar,
      expandSidebar,
      toggleMobileMenu,
      openMobileMenu,
      closeMobileMenu,
    }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

export default SidebarContext;
