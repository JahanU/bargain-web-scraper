import { ChangeEvent } from "react";
import { useFilterParams } from "../../hooks/useFilterParams";

function SearchBar() {
  const { search, setSearch } = useFilterParams();

  const handleSearch = (event: ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
  };

  return (
    <div className="flex justify-center">
      <input
        onChange={handleSearch}
        value={search}
        type="search"
        className="
                    form-control block w-96 px-3 py-1.5 text-base font-normal text-gray-700
                    bg-white bg-clip-padding
                    border border-solid border-gray-300
                    rounded 
                    transition ease-in-out
                    m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none"
        placeholder="Search for items and brands"
      />
    </div>
  );
}

export default SearchBar;
