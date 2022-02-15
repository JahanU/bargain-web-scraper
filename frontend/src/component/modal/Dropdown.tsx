/* eslint-disable jsx-a11y/anchor-is-valid */
/* This example requires Tailwind CSS v2.0+ */
import { Fragment } from 'react'
import { Menu, Transition } from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/solid'
import { useDispatch } from 'react-redux'
import { filterActions } from '../../store/filterSlice';

function classNames(...classes: any[]) {
    return classes.filter(Boolean).join(' ')
}

export default function Dropdown() {

    const dispatch = useDispatch(); // Dispatch similar to in useReducer

    const onLatestHandler = () => dispatch(filterActions.setLatset());
    const onDiscountHighToLowHandler = (setFilter: boolean) => dispatch(filterActions.setDiscountHighToLow(setFilter));
    const onPriceHighToLowHandler = (setFilter: boolean) => dispatch(filterActions.setPriceHighToLow(setFilter));

    return (
        <Menu as="div" className="relative inline-block text-left z-10">
            <div>
                <Menu.Button className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-indigo-500">
                    Options
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
                        <Menu.Item onClick={onLatestHandler}>
                            {({ active }) => (
                                <a
                                    href="#"
                                    className={classNames(
                                        active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                        'block px-4 py-2 text-sm'
                                    )}
                                > Latest
                                </a>
                            )}
                        </Menu.Item>
                        <Menu.Item onClick={(() => onDiscountHighToLowHandler(true))}>
                            {({ active }) => (
                                <a
                                    href="#"
                                    className={classNames(
                                        active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                        'block px-4 py-2 text-sm'
                                    )}
                                >
                                    Discount (High to Low)
                                </a>

                            )}
                        </Menu.Item>
                        <Menu.Item onClick={(() => onDiscountHighToLowHandler(false))}>
                            {({ active }) => (
                                <a
                                    href="#"
                                    className={classNames(
                                        active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                        'block px-4 py-2 text-sm'
                                    )}
                                >
                                    Discount (Low to High)
                                </a>
                            )}
                        </Menu.Item>
                        <Menu.Item onClick={(() => onPriceHighToLowHandler(true))}>
                            {({ active }) => (
                                <a
                                    href="#"
                                    className={classNames(
                                        active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                        'block px-4 py-2 text-sm'
                                    )}
                                >
                                    Price (High to Low)
                                </a>
                            )}
                        </Menu.Item>
                        <Menu.Item onClick={(() => onPriceHighToLowHandler(false))}>
                            {({ active }) => (
                                <a
                                    href="#"
                                    className={classNames(
                                        active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                        'block px-4 py-2 text-sm'
                                    )}
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
