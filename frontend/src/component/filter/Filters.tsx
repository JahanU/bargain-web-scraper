import DiscountSlider from "./DiscountSlider";
import SortDropdown from "./dropdowns/SortDropdown";
import SizeDropdown from "./dropdowns/SizeDropdown";
// import Genders from "./Genders";
import SearchBar from "./SearchBar";

const filters = [
  { id: "discount", element: <DiscountSlider /> },
  { id: "search", element: <SearchBar /> },
  { id: "sort", element: <SortDropdown /> },
  { id: "size", element: <SizeDropdown /> },
];

function Filters() {
  return (
    <section className="bg-gray-100">
      <nav className="flex justify-between p-6 px-4">
        <div className="flex items-center w-full">
          <div className="xl:w-full">
            <ul className="flex flex-wrap justify-center gap-6">
              {filters.map(({ id, element }) => (
                <li key={id}>{element}</li>
              ))}
            </ul>
          </div>
        </div>
      </nav>
    </section>
  );
}

export default Filters;
