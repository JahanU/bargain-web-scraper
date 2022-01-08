import ItemCard from './ItemCard';
import Item from '../interfaces/Item';

function ItemTable({ items, isLoading }: { items: Item[], isLoading: boolean }) {

    if (isLoading) {
        return (
            <div className="max-w-2xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:max-w-7xl lg:px-8">
                <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">Loading</h2>
            </div>
        )
    }

    if (!isLoading && items.length === 0) {
        console.log(items);
        return (
            <div className="max-w-2xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:max-w-7xl lg:px-8">
                <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">Sorry!</h2>
                <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">No Items Found...</h2>
            </div>
        );
    }

    return (
        <div className="bg-white">
            <div className="max-w-2xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:max-w-7xl lg:px-8">
                <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">Latest Picks</h2>
                <div className="mt-6 grid grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 lg:grid-cols-3 xl:gap-x-8">
                    {items.map((item: any) => <ItemCard key={item[0]} item={item} />)}
                </div>
            </div>
        </div>
    )
}

export default ItemTable;
