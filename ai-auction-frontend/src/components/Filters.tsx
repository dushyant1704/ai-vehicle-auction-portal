import { SlidersHorizontal } from 'lucide-react';

interface FiltersProps {
  yearFilter: string;
  mileageFilter: string;
  sortBy: string;
  onYearChange: (year: string) => void;
  onMileageChange: (mileage: string) => void;
  onSortChange: (sort: string) => void;
}

function Filters({
  yearFilter,
  mileageFilter,
  sortBy,
  onYearChange,
  onMileageChange,
  onSortChange,
}: FiltersProps) {

  /* Shared style objects — built from CSS variables so they react to theme */
  const panelStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
  };

  const labelStyle: React.CSSProperties = {
    color: 'var(--text-secondary)',
  };

  const selectStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
  };

  return (
    <div
      className="backdrop-blur-sm rounded-xl p-6 mb-8"
      style={panelStyle}
    >
      <div className="flex items-center space-x-2 mb-4">
        <SlidersHorizontal className="w-5 h-5 text-indigo-400" />
        <h3
          className="text-lg font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          Filters &amp; Sort
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label
            className="block text-sm font-medium mb-2"
            style={labelStyle}
          >
            Year
          </label>
          <select
            value={yearFilter}
            onChange={(e) => onYearChange(e.target.value)}
            className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            style={selectStyle}
          >
            <option value="">All Years</option>
            <option value="2024">2024</option>
            <option value="2023">2023</option>
            <option value="2022">2022</option>
            <option value="2021">2021</option>
            <option value="2020">2020</option>
            <option value="2019">2019</option>
            <option value="2018">2018</option>
            <option value="older">2017 &amp; Older</option>
          </select>
        </div>

        <div>
          <label
            className="block text-sm font-medium mb-2"
            style={labelStyle}
          >
            Mileage
          </label>
          <select
            value={mileageFilter}
            onChange={(e) => onMileageChange(e.target.value)}
            className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            style={selectStyle}
          >
            <option value="">All Mileage</option>
            <option value="0-50000">0 - 50,000 km</option>
            <option value="50000-100000">50,000 - 100,000 km</option>
            <option value="100000-150000">100,000 - 150,000 km</option>
            <option value="150000+">150,000+ km</option>
          </select>
        </div>

        <div>
          <label
            className="block text-sm font-medium mb-2"
            style={labelStyle}
          >
            Sort By
          </label>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            style={selectStyle}
          >
            <option value="latest">Latest</option>
            <option value="year-desc">Year (Newest)</option>
            <option value="year-asc">Year (Oldest)</option>
            <option value="mileage-asc">Mileage (Low to High)</option>
            <option value="mileage-desc">Mileage (High to Low)</option>
          </select>
        </div>
      </div>
    </div>
  );
}

export default Filters;
