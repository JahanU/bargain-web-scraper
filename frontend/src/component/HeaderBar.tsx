import React from 'react';
import { Popover } from '@headlessui/react'
import DiscountSlider from './DiscountSlider';
import Logo from '../assets/hxh-logo.png';

function HeaderBar() {
    return (
        <Popover className="relative bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <div className="flex justify-between items-center border-b-2 border-gray-100 py-6 md:justify-start md:space-x-10">
                    <div className="flex justify-start lg:w-0 lg:flex-1">
                        <a href="#">
                            <span className="sr-only">Workflow</span>
                            <img
                                className="h-20"
                                src={Logo}
                                alt=""
                            />
                        </a>
                    </div>
                    <div className="md:flex items-center justify-end md:flex-1 lg:w-0">
                        <DiscountSlider />
                    </div>

                    {/* <div className="hidden md:flex items-center justify-end md:flex-1 lg:w-0">
                        <a href="#" className="whitespace-nowrap text-base font-medium text-gray-500 hover:text-gray-900">
                            Sign in
                        </a>
                        <a
                            href="#"
                            className="ml-8 whitespace-nowrap inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                        >
                            Sign up
                        </a>
                    </div> */}

                </div>
            </div>
        </Popover>
    )
}

export default HeaderBar;