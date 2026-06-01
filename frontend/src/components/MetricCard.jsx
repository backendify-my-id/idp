import React from 'react';

const MetricCard = ({
  title,
  value,
  subText,
  icon,
  type = 'indigo', // indigo, purple, cyan, emerald
  onClick
}) => {
  const colorSchemes = {
    indigo: {
      iconBg: 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-650 dark:text-indigo-450',
      subTextColor: 'text-emerald-500'
    },
    purple: {
      iconBg: 'bg-purple-50 dark:bg-purple-950/30 text-purple-650 dark:text-purple-450',
      subTextColor: 'text-indigo-500'
    },
    cyan: {
      iconBg: 'bg-cyan-50 dark:bg-cyan-950/30 text-cyan-650 dark:text-cyan-450',
      subTextColor: 'text-emerald-500'
    },
    emerald: {
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-650 dark:text-emerald-455',
      subTextColor: 'text-slate-400'
    }
  };

  const scheme = colorSchemes[type] || colorSchemes.indigo;

  return (
    <div
      onClick={onClick}
      className={`p-5 border border-slate-200/50 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/40 backdrop-blur rounded-2xl flex items-center justify-between gap-4 shadow-sm hover:scale-[1.01] transition-transform select-none ${
        onClick ? 'cursor-pointer hover:bg-white/80 dark:hover:bg-slate-900/60' : ''
      }`}
    >
      <div className="text-left min-w-0">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block truncate">
          {title}
        </span>
        <h4 className="text-2xl font-black text-slate-850 dark:text-white mt-1 leading-none tracking-tight truncate">
          {value}
        </h4>
        {subText && (
          <span className={`text-[8.5px] font-extrabold uppercase tracking-wide block mt-1.5 truncate ${scheme.subTextColor}`}>
            {subText}
          </span>
        )}
      </div>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${scheme.iconBg}`}>
        {icon}
      </div>
    </div>
  );
};

export default MetricCard;
