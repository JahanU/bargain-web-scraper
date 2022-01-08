import React from 'react';
import { Popover } from '@headlessui/react'
import DiscountSlider from './DiscountSlider';
import Logo from '../assets/hxh-logo.png';

function HeaderBar(props: any) {

    const onSliderChange = (discount: number) => {
        props.onSliderChange(discount);
    }

    return (
        <Popover className="relative bg-white">
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
                        </a>
                    </div>
                    <div className="md:flex items-center justify-end md:flex-1 lg:w-0">
                        <DiscountSlider onSliderChange={onSliderChange} />
                    </div>
                </div>
            </div>
        </Popover>
    )
}

export default HeaderBar;