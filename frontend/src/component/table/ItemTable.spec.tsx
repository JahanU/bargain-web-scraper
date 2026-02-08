import { render, screen } from '@testing-library/react';
import ItemTable from './ItemTable';
import '@testing-library/jest-dom'

// Mock data for items
const mockItems: any[] = [
    { id: 1, name: 'Item 1', imageUrl: '...', url: 'https://example.com/1' },
    { id: 2, name: 'Item 2', imageUrl: '...', url: 'https://example.com/2' },
];

describe('ItemTable', () => {
    it('renders "Loading" message while isLoading is true', () => {
        render(<ItemTable items={[]} isLoading={true} />);
        const loadingText = screen.getByText('Loading');
        expect(loadingText).toBeInTheDocument();
    });

    it('renders "No Items Found" message when items is empty and isLoading is false', () => {
        render(<ItemTable items={[]} isLoading={false} />);
        const noItemsText = screen.getByText('Sorry!');
        expect(noItemsText).toBeInTheDocument();
    });


    it('renders ItemCard components for each item', () => {
        render(<ItemTable items={mockItems} isLoading={false} />);
        const header = screen.getByText('Latest Picks');
        expect(header).toBeInTheDocument();
        const itemsLength = screen.getByText('(2)');
        expect(itemsLength).toBeInTheDocument();
    });
});
