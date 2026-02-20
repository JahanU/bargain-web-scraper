import { useEffect, useRef, useState } from "react";
import { getItemsService } from "../services/webScrape.service";
import Item from "../interfaces/Item";

interface UseItemsResult {
    items: Item[];
    isLoading: boolean;
    isError: boolean;
}

export function useItems(): UseItemsResult {
    const [items, setItems] = useState<Item[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;

        setIsLoading(true);
        getItemsService()
            .then((responseItems: Item[]) => {
                if (!isMounted.current) {
                    return;
                }

                if (!Array.isArray(responseItems) || responseItems.length === 0) {
                    setIsError(true);
                    return;
                }

                setItems(responseItems);
            })
            .catch(() => {
                if (isMounted.current) {
                    setIsError(true);
                }
            })
            .finally(() => {
                if (isMounted.current) {
                    setIsLoading(false);
                }
            });

        return () => {
            isMounted.current = false;
        };
    }, []);

    return { items, isLoading, isError };
}
