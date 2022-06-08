import { useDispatch } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { filterActions } from '../../store/filterSlice';

export const Genders = (props: any) => {

    let [, setSearchParams] = useSearchParams(); 
    const dispatch = useDispatch();

    const setGenderHandler = (value: boolean) => {
        const gender = value ? 'Male' : 'Female';
        // setSearchParams({ gender });
        dispatch(filterActions.setGender(value));
    }

    return (
        <>
            <div className="flex justify-center">
            <div>
                <div className="form-check">
                <input onChange={(() => setGenderHandler(true))} className="form-check-input appearance-none h-4 w-4 border border-gray-300 rounded-sm bg-white checked:bg-blue-600 checked:border-blue-600 focus:outline-none transition duration-200 mt-1 align-top bg-no-repeat bg-center bg-contain float-left mr-2 cursor-pointer" type="checkbox" value="" id="flexCheckDefault"/>
                <label className="form-check-label inline-block text-gray-800" htmlFor="flexCheckDefault">
                    Male
                </label>
                
                <input onChange={(() => setGenderHandler(false))} className="form-check-input appearance-none h-4 w-4 border border-gray-300 rounded-sm bg-white checked:bg-blue-600 checked:border-blue-600 focus:outline-none transition duration-200 mt-1 align-top bg-no-repeat bg-center bg-contain float-left mr-2 cursor-pointer" type="checkbox" value="" id="flexCheckDefault"/>
                <label className="form-check-label inline-block text-gray-800" htmlFor="flexCheckDefault">
                    Female
                </label>
                </div>
            </div>
            </div>
        </>
    )
};
