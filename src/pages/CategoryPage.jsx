import { useParams, Navigate } from 'react-router-dom';
import PageLayout from '../components/PageLayout';
import CaseStudyCard from '../components/CaseStudyCard';
import CategorySidebar from '../components/CategorySidebar';
import { categories, caseStudies } from '../data/content';

function CategoryPage() {
  const { slug } = useParams();
  
  const category = categories.find((c) => c.slug === slug);
  const studies = caseStudies[slug] || [];

  if (!category) {
    return <Navigate to="/404" replace />;
  }

  return (
    <PageLayout title={category.title} description={category.description}>
      <div className="container--wide">
        <div className="category-page">
          <div className="case-studies">
            {studies.map((study) => (
              <CaseStudyCard key={study.slug} {...study} />
            ))}
          </div>
          <CategorySidebar
            number={category.number}
            title={category.title}
            description={category.description}
            count={category.count}
          />
        </div>
      </div>
    </PageLayout>
  );
}

export default CategoryPage;
