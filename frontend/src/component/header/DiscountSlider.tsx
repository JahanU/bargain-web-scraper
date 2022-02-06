import { useState, useEffect } from 'react';

function DiscountSlider(props: any) {

    const [discount, setDiscount] = useState(10);

    const handleSlider = (e: any) => {
        setDiscount(e.target.value);
        // props.onSliderChange(discount);
    }

    useEffect(() => {
        props.onSliderChange(discount);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [discount]);

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