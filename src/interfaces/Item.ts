export interface Item {
    name: string,
    wasPrice: string,
    nowPrice: string,
    discount: number,
    url: string,
    imageUrl?: string,
    // inStock?: boolean,
    sizes?: string[],
}