import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import type {  FolderDto  } from '../../types';

interface BreadcrumbNavProps {
  breadcrumbs: FolderDto[];
}

const BreadcrumbNav: React.FC<BreadcrumbNavProps> = ({ breadcrumbs }) => {
  return (
    <nav className="flex items-center space-x-1 text-sm font-medium text-slate-500 mb-6">
      <Link 
        to="/" 
        className="flex items-center hover:text-blue-600 transition-colors p-1 rounded-md hover:bg-slate-100"
      >
        <Home className="w-4 h-4" />
      </Link>
      
      {breadcrumbs.map((folder, index) => (
        <Fragment key={folder.id}>
          <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
          <Link
            to={`/folder/${folder.id}`}
            className={`hover:text-blue-600 transition-colors px-2 py-1 rounded-md hover:bg-slate-100 truncate max-w-[150px] sm:max-w-[200px] ${
              index === breadcrumbs.length - 1 ? 'text-slate-900 font-semibold' : ''
            }`}
          >
            {folder.name}
          </Link>
        </Fragment>
      ))}
    </nav>
  );
};

export default BreadcrumbNav;
