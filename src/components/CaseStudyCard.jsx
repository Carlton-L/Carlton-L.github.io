import { Link } from 'react-router-dom';
import { PlusIcons } from './PlusIcons';

function CaseStudyCard({ title, description, meta, image, slug }) {
  return (
    <Link to={`/case-study/${slug}`} className="case-study">
      <PlusIcons />
      <div className="case-study__image">
        <img src={image} alt={title} loading="lazy" />
      </div>
      <div className="case-study__content">
        <div className="case-study__info">
          <h2 className="case-study__title">{title}</h2>
          <p className="case-study__description">{description}</p>
          <span className="case-study__meta">{meta}</span>
        </div>
        <span className="case-study__arrow">↗</span>
      </div>
    </Link>
  );
}

export default CaseStudyCard;
