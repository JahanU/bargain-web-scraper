/* eslint-disable jsx-a11y/anchor-is-valid */
import { Fragment } from 'react'
import { Menu, Transition } from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/solid'
import { useDispatch, useSelector } from 'react-redux'
import { filterActions } from '../../../store/filterSlice';
import { paramActions } from '../../../store/paramSlice';
import { Sort } from '../../../interfaces/Sort';

function classNames(...classes: any[]) {
    return classes.filter(Boolean).join(' ')
}

export default function Dropdown() {

    const dispatch = useDispatch(); // Dispatch similar to in useReducer
    const isPriceSort = useSelector((state: any) => state.filterStore.priceHighToLow);
    const isDiscountSort = useSelector((state: any) => state.filterStore.discountHighToLow);

    const onDiscountHighToLowHandler = (filter: boolean) => {
        const sort = filter ? Sort.discountHighToLow : Sort.discountLowToHigh;
        dispatch(filterActions.setDiscountHighToLow(filter));
        dispatch(paramActions.setSortParams({ sort }));
    };

    const onPriceHighToLowHandler = (filter: boolean) => {
        const sort = filter ? Sort.priceHighToLow : Sort.priceLowToHigh;
        dispatch(filterActions.setPriceHighToLow(filter));
        dispatch(paramActions.setSortParams({ sort }));
    }

    return (
        <Menu as="div" className="relative inline-block text-left z-10">
            <div>
                <Menu.Button className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-indigo-500">
                    Sort
                    <ChevronDownIcon className="-mr-1 ml-2 h-5 w-5" aria-hidden="true" />
                </Menu.Button>
            </div>

            <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
            >
                <Menu.Items className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="py-1">
                        <Menu.Item onClick={(() => onDiscountHighToLowHandler(true))}>
                            {({ active }) => (
                                    <a
                                    className={
                                        `text-gray-90 text-gray-700 block px-4 py-2 text-sm bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:bg-indigo-800 `
                                        +
                                        classNames(isDiscountSort ? "bg-indigo-400 text-white" : "bg-gray-100 text-gray-900 opacity-70")}
                                    >
                                        Discount (High to Low)
                                    </a>

                            )}
                        </Menu.Item>
                        <Menu.Item onClick={(() => onDiscountHighToLowHandler(false))}>
                            {({ active }) => (
                                <a
                                className={
                                    `text-gray-90 text-gray-700 block px-4 py-2 text-sm bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:bg-indigo-800 `
                                    +
                                    classNames(isDiscountSort === false ? "bg-indigo-400 text-white" : "bg-gray-100 text-gray-900 opacity-70")}
                                >
                                    Discount (Low to High)
                                </a>
                            )}
                        </Menu.Item>
                        <Menu.Item onClick={(() => onPriceHighToLowHandler(true))}>
                            {({ active }) => (
                                  <a
                                  className={
                                      `text-gray-90 text-gray-700 block px-4 py-2 text-sm bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:bg-indigo-800 `
                                      +
                                      classNames(isPriceSort? "bg-indigo-400 text-white" : "bg-gray-100 text-gray-900 opacity-70")}
                                  >
                                      Price (High to Low)
                                  </a>
                            )}
                        </Menu.Item>
                        <Menu.Item onClick={(() => onPriceHighToLowHandler(false))}>
                            {({ active }) => (
                                  <a
                                  className={
                                      `text-gray-90 text-gray-700 block px-4 py-2 text-sm bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:bg-indigo-800 `
                                      +
                                      classNames(isPriceSort === false ? "bg-indigo-400 text-white" : "bg-gray-100 text-gray-900 opacity-70")}
                                  >
                                      Price (Low to High)
                                  </a>
                            )}
                        </Menu.Item>
                    </div>
                </Menu.Items>
            </Transition>
        </Menu>
    )
}
