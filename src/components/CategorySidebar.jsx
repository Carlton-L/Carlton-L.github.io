import { Link } from 'react-router-dom';
import { PlusIcons } from './PlusIcons';

function CategorySidebar({ number, title, description, count }) {
  return (
    <aside className="category-sidebar">
      <div className="category-info">
        <PlusIcons />
        <span className="category-number">{number}</span>
        <h1 className="category-title">{title}</h1>
        <p className="category-description">{description}</p>
        <span className="category-count">{count}</span>
      </div>
      <Link to="/" className="back-link">
        <span>←</span> Back to home
      </Link>
    </aside>
  );
}

export default CategorySidebar;
