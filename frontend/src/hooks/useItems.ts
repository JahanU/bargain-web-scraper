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
                // prevents memory leaks, race conditions, and unnecessary state updates
                if (!isMounted.current) { // Prevent state update if component is unmounted
                    return;
                }

                if (!Array.isArray(responseItems) || responseItems.length === 0) { // Prevent state update if response is not an array or is empty
                    setIsError(true);
                    return;
                }

                setItems(responseItems);
            })
            .catch(() => {
                if (isMounted.current) { // Prevent state update if component is unmounted
                    setIsError(true);
                }
            })
            .finally(() => {
                if (isMounted.current) { // Prevent state update if component is unmounted
                    setIsLoading(false);
                }
            });

        return () => {
            isMounted.current = false; // Set ref to false when component unmounts
        };
    }, []);

    return { items, isLoading, isError };
}
