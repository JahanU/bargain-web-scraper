import Item from "../../interfaces/Item";

function ItemCard(props: any) {

    const item = props.item as Item;
    const sizes = item.sizes?.toString();
    
    return (
        <div className="relative">
            < div className="w-full min-h-80 bg-gray-200 aspect-w-1 aspect-h-1 rounded-md  hover:opacity-75 lg:h-80 lg:aspect-none shadow-lg" >
                <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-center object-cover lg:w-full lg:h-full"
                />
            </div >
            <div className="mt-4 flex justify-between">
                <div>
                    <h3 className="text-sm text-gray-700">
                        <a href={item.url} target="_blank" rel="noreferrer">
                            <span aria-hidden="true" className="absolute inset-0" />
                            {item.name}
                        </a>
                    </h3>
                    <h4 className="text-sm text-gray-700 text-left">
                        <a href={item.url} target="_blank" rel="noreferrer">
                            <span aria-hidden="true" className="absolute inset-0" />
                            {item.gender}
                        </a>
                    </h4>
                    <h4 className="text-sm text-gray-700 text-left">
                        <a href={item.url} target="_blank" rel="noreferrer">
                            <span aria-hidden="true" className="absolute inset-0" />
                            {sizes}
                        </a>
                    </h4>
                    <h4 className="text-sm text-gray-700 text-left">
                        <a href={item.url} target="_blank" rel="noreferrer">
                            <span aria-hidden="true" className="absolute inset-0" />
                            Found {new Date(item.timestamp).toLocaleTimeString()} {(new Date(item.timestamp).getHours() < 12 ? 'AM' : 'PM')}
                        </a>
                    </h4>
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-900">{item.nowPrice} ({item.discount}% off)</p>
                </div>
            </div>
        </div >
    );
}

export default ItemCard;
