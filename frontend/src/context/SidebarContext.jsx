import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const SidebarContext = createContext();

// Breakpoint at which we switch from mobile-overlay to desktop-fixed mode (1024px / lg)
const DESKTOP_BREAKPOINT = 1024;

export const SidebarProvider = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('gm_sidebar_collapsed');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  // Mobile drawer state — ALWAYS false (closed) by default on mobile/small screens
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Track whether we're in mobile mode
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < DESKTOP_BREAKPOINT;
    }
    return false;
  });

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < DESKTOP_BREAKPOINT;
      setIsMobile(mobile);
      // Close mobile drawer whenever screen is resized to desktop
      if (!mobile) setIsMobileOpen(false);
    };

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isMobile && isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobile, isMobileOpen]);

  // Escape key listener to close drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isMobileOpen) {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen]);

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
