import React from 'react';
import { ChevronRight } from 'lucide-react';


interface BreadcrumbItem {
  name: string;
  path: string;
  icon?: any;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

const Breadcrumb = ({ items }: BreadcrumbProps) => {
  return (
    <div className="flex items-center mb-6 text-sm text-gray-600 dark:text-gray-400">
      {items.map((item, index) => (
        <React.Fragment key={item.path || String(index)}>
          {index > 0 && <ChevronRight size={14} className="mx-2" />}
          <div className="flex items-center">
            {index === 0 && item.icon ? item.icon : null}
            <span className={index === 0 ? "ml-2" : ""}>{item.name}</span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
};

export default Breadcrumb;
