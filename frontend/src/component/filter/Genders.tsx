import { useDispatch } from 'react-redux';
import { filterActions } from '../../store/filterSlice';

export const Genders = (props: any) => {

    const dispatch = useDispatch();
    const setGenderHandler = (value: boolean) => dispatch(filterActions.setGender(value));

    return (
        <>
            <div className="flex justify-center">
                <div>
                    <div className="form-check">
                        <input onChange={(() => setGenderHandler(true))} className="form-check-input appearance-none rounded-full h-4 w-4 border border-gray-300 bg-white checked:bg-blue-600 checked:border-blue-600 focus:outline-none transition duration-200 mt-1 align-top bg-no-repeat bg-center bg-contain float-left mr-2 cursor-pointer" type="radio" name="flexRadioDefault" />
                        <label className="form-check-label inline-block text-gray-800" htmlFor="flexRadioDefault1">
                            Male
                        </label>
                    </div>
                    <div className="form-check">
                        <input onChange={(() => setGenderHandler(false))} className="form-check-input appearance-none rounded-full h-4 w-4 border border-gray-300 bg-white checked:bg-blue-600 checked:border-blue-600 focus:outline-none transition duration-200 mt-1 align-top bg-no-repeat bg-center bg-contain float-left mr-2 cursor-pointer" type="radio" name="flexRadioDefault" />
                        <label className="form-check-label inline-block text-gray-800" htmlFor="flexRadioDefault2">
                            Female
                        </label>
                    </div>
                </div>
            </div>
        </>
    )
};
