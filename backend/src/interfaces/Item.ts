export interface Item {
    name: string,
    wasPrice: string,
    nowPrice: string,
    discount: number,
    url: string,
    imageUrl?: string,
    sizes?: string[],
    inStock?: string
    timestamp: number
    gender: string
}