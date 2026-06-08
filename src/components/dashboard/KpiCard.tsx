import React from 'react';

interface KpiCardProps {
  icon: any;
  title: string;
  value: string;
  subtext: string;
  trend?: number;
  color: string;
}

const KpiCard = ({ icon, title, value, subtext, trend, color }: KpiCardProps) => {

  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-xl ${color}`}>
          {icon}
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
            trend > 0
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
          }`}>
            {trend > 0 ? `+${trend}%` : `${trend}%`}
          </span>
        )}
      </div>
      <h3 className="mt-4 text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
      <p className="mt-1 text-2xl font-semibold dark:text-white">{value}</p>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtext}</p>
    </div>
  );
};

export default KpiCard;
