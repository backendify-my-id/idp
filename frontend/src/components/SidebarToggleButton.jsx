import React from 'react';

/**
 * SidebarToggleButton - Reusable modern toggle button for sidebar state control
 * @param {boolean} isCollapsed - Active collapsed state of the sidebar
 * @param {function} onToggle - State modifier callback
 * @param {string} className - Optional tailwind classes for custom positioning/styling
 */
const SidebarToggleButton = ({ isCollapsed, onToggle, className = "" }) => {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#06080f] shadow-md text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all hover:scale-110 active:scale-95 cursor-pointer z-50 ${className}`}
      title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
    >
      <svg
        className={`transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        viewBox="0 0 24 24"
        style={{ width: '14px', height: '14px' }}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
    </button>
  );
};

export default SidebarToggleButton;
