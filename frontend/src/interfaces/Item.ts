interface Item {
    name: string,
    wasPrice: number,
    nowPrice: number,
    discount: number,
    url: string,
    imageUrl?: string,
    sizes: string[],
    inStock?: string
    timestamp: number
    gender: string
}

export default Item;