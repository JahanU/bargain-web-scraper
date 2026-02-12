import Item from "../../interfaces/Item";

interface ItemCardProps {
  item: Item;
}

function formatFoundTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function ItemCard({ item }: ItemCardProps) {
  const sizes = item.sizes?.join(", ") ?? "N/A";

  return (
    <div className="relative">
      <div className="w-full min-h-80 bg-gray-200 aspect-w-1 aspect-h-1 rounded-md hover:opacity-75 lg:h-80 lg:aspect-none shadow-lg">
        <img
          src={item.imageUrl}
          alt={item.name}
          className="w-full h-full object-center object-cover lg:w-full lg:h-full"
        />
      </div>

      <div className="mt-4 flex justify-between gap-3">
        <div className="text-left">
          <h3 className="text-sm text-gray-700">
            <a href={item.url} target="_blank" rel="noreferrer">
              {item.name}
            </a>
          </h3>
          <p className="text-sm text-gray-700">{item.gender}</p>
          <p className="text-sm text-gray-700">{sizes}</p>
          <p className="text-sm text-gray-700">Found {formatFoundTime(item.timestamp)}</p>
        </div>

        <p className="text-sm font-medium text-gray-900 whitespace-nowrap">
          {item.nowPrice} ({item.discount}% off)
        </p>
      </div>
    </div>
  );
}

export default ItemCard;
