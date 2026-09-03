import "./CategoryFilter.css";

export default function CategoryFilter({ categories, activeSlug, onSelect }) {
  return (
    <div className="category-filter" role="group" aria-label="Filter by category">
      <button
        type="button"
        className={`category-filter__chip ${!activeSlug ? "category-filter__chip--active" : ""}`}
        onClick={() => onSelect(null)}
      >
        All
      </button>
      {categories.map((cat) => (
        <button
          type="button"
          key={cat._id}
          className={`category-filter__chip ${
            activeSlug === cat.slug ? "category-filter__chip--active" : ""
          }`}
          onClick={() => onSelect(cat.slug)}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}
