import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { filterActions } from '../../store/filterSlice';

function SearchBar() {

    const dispatch = useDispatch();
    // const [search, setSearch] = useState('');
    // const [isLoading, setIsLoading] = useState(false);

    const handleSearch = (e: any) => {
        dispatch(filterActions.setSearch(e.target.value));
    }


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
    )
}

export default SearchBar;