import { useState } from 'react';
import { Popover } from '@headlessui/react'
import DiscountSlider from './DiscountSlider';
import Dropdown from '../modal/Dropdown';
import Logo from '../../assets/hxh-logo.png';
import NewFeature from '../modal/NewFeatures';

function HeaderBar(props: any) {

    const [open, setOpen] = useState(false);

    const onSliderChange = (discount: number) => {
        props.onSliderChange(discount);
    }


    return (
        <Popover className="relative bg-white">
            {open && <NewFeature closeModal={setOpen} isOpen={open} />}
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <div className="flex justify-between items-center border-b-2 border-gray-100 py-6 md:justify-start md:space-x-10">
                    <div className="flex justify-start lg:w-0 lg:flex-1">
                        <a href="https://github.com/JahanU/bargain-web-scraper">
                            <span className="sr-only">Workflow</span>
                            <img
                                className="h-20"
                                src={Logo}
                                alt=""
                            />
                            <h1 className="text-base font-extrabold tracking-tight text-gray-1200">Bargain Scraper</h1>

                        </a>
                    </div>

                    <div className="md:flex items-center justify-end md:flex-1 lg:w-0">
                        <DiscountSlider onSliderChange={onSliderChange} />
                    </div>

                    <div>
                        <Dropdown />
                    </div>

                    <button onClick={() => setOpen(true)} className="bg-transparent hover:bg-red-500 text-red-700 font-semibold hover:text-white py-2 px-4 border border-red-500 hover:border-transparent rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                        </svg>
                    </button>
                </div>
            </div>
        </Popover>
    )
}

export default HeaderBar;