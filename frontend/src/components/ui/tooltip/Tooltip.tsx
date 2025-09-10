import React from 'react';

interface TooltipProps {
  children: React.ReactNode;
  text: string;
}

const Tooltip: React.FC<TooltipProps> = ({ children, text }) => {
  return (
    <div className="relative inline-flex items-center group">
      {children}
      <div className="absolute bottom-full right-0 mb-2 max-w-[220px] px-2 py-1 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-50 whitespace-normal break-words shadow-lg">
        {text}
      </div>
    </div>
  );
};

export default Tooltip;
