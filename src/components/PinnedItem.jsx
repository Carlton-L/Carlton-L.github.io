import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { PlusIcons } from './PlusIcons';

function PinnedItem({ title, description, category, slug, accent, image }) {
  return (
    <Link to={`/case-study/${slug}`} className={clsx('pinned-item', accent)}>
      <PlusIcons />
      <div className="pinned-item__image">
        <img src={image} alt={title} loading="lazy" />
      </div>
      <div className="pinned-item__content">
        <div className="pinned-item__info">
          <span className="pinned-item__category">{category}</span>
          <h2 className="pinned-item__title">{title}</h2>
          <p className="pinned-item__description">{description}</p>
        </div>
        <span className="pinned-item__arrow">↗</span>
      </div>
    </Link>
  );
}

export default PinnedItem;
