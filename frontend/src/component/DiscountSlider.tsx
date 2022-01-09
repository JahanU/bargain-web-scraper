import React from 'react';
import { useState, useEffect } from 'react';

function DiscountSlider(props: any) {

    const [discount, setDiscount] = useState(0);

    const handleSlider = (e: any) => {
        console.log('slider touched');
        setDiscount(e.target.value);
    }


    useEffect(() => {
        props.onSliderChange(discount);
    }, [discount]);


    return (
        <div className="relative">

            <div>
                <label className="m-1 bg-slate-40">
                    Discount: {discount}%
                </label>
                <input type="range" min="0" max="100" step="10" className="w-11/12"
                    onChange={handleSlider} value={discount}
                />
            </div>

        </div>
    );
}



export default DiscountSlider;