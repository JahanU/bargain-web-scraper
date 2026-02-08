import { ChangeEvent, useState } from 'react';
import { useDispatch } from 'react-redux';
import { filterActions } from '../../store/filterSlice';
import { AppDispatch } from '../../store';

function DiscountSlider() {

    const dispatch = useDispatch<AppDispatch>();
    const [discount, setDiscount] = useState(10);

    const handleSlider = (event: ChangeEvent<HTMLInputElement>) => {
        const discountValue = Number.parseInt(event.target.value, 10);
        setDiscount(discountValue);
        dispatch(filterActions.setDiscount(discountValue));
    }

    return (
        <div className="relative">
            <div>
                <label className="text-sm text-gray-700">
                    Discount: {discount}%
                </label>
                <input type="range" min="10" max="100" step="10" className="w-11/12 bg-orange-400"
                    onChange={handleSlider} value={discount}
                />
            </div>
        </div>
    );
}



export default DiscountSlider;
