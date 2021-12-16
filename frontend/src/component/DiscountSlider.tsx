import react from 'react';

function DiscountSlider() {

    const [discount, setDiscount] = react.useState(0);

    const handleSlider = (e: any) => {
        setDiscount(e.target.value);
    }

    return (
        <div className="relative">
            {/* <input type="text" id="simple-email"
                className="flex-1 appearance-none border border-gray-300 w-full py-2 px-4 bg-white text-gray-700 placeholder-gray-400 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                placeholder="Your email"
            /> */}


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