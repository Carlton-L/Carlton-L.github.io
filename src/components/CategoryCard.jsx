import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { PlusIcons } from './PlusIcons';

function CategoryCard({ number, title, subtitle, count, slug, accent, image }) {
  return (
    <div className={clsx('plus-grid__item', accent)}>
      <PlusIcons />
      <Link to={`/category/${slug}`} className="category-card">
        <div className="card-header">
          <span className="card-number">{number}</span>
          <span className="card-arrow">↗</span>
        </div>
        <div className="card-body">
          <img src={image} alt={title} loading="lazy" />
        </div>
        <div className="card-footer">
          <h2 className="card-title">{title}</h2>
          <p className="card-subtitle">{subtitle}</p>
          <div className="card-meta">
            <span className="card-count">{count}</span>
          </div>
        </div>
      </Link>
    </div>
  );
}

export default CategoryCard;
