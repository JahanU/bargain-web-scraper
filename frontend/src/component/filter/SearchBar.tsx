import { useDispatch } from "react-redux";
import { filterActions } from "../../store/filterSlice";
import { paramActions } from "../../store/paramSlice";

function SearchBar() {
  const dispatch = useDispatch();
  // eg "/shoes?brand=nike&sort=asc&sortby=price"
  const handleSearch = (e: any) => {
    let input = e.target.value;
    dispatch(paramActions.setSearchInputParams({ input }));
    dispatch(filterActions.setSearch(input));
  };

  return (
    <div className="flex justify-center">
      <input
        onChange={handleSearch}
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
