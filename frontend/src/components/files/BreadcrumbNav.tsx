import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import type { FolderDto } from '../../types';

interface BreadcrumbNavProps {
  breadcrumbs: FolderDto[];
}

const BreadcrumbNav: React.FC<BreadcrumbNavProps> = ({ breadcrumbs }) => {
  return (
    <nav className="flex items-center space-x-1 text-sm font-medium text-[#638ECB] mb-6">
      <Link 
        to="/" 
        className="flex items-center text-[#638ECB] hover:text-[#395886] transition-colors p-1.5 rounded-lg hover:bg-[#D5DEEF]/50"
      >
        <Home className="w-4 h-4" />
      </Link>
      
      {breadcrumbs.map((folder, index) => (
        <Fragment key={folder.id}>
          <ChevronRight className="w-4 h-4 text-[#8AAEE0] flex-shrink-0" />
          <Link
            to={`/folder/${folder.id}`}
            className={`hover:text-[#395886] transition-colors px-2.5 py-1 rounded-lg hover:bg-[#D5DEEF]/50 truncate max-w-[150px] sm:max-w-[200px] ${
              index === breadcrumbs.length - 1 ? 'text-[#395886] font-bold bg-[#D5DEEF]/60 shadow-sm' : 'text-[#638ECB]'
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
