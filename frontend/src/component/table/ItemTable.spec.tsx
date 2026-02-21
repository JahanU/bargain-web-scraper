import { render, screen } from '@testing-library/react';
import ItemTable from './ItemTable';
import '@testing-library/jest-dom';
import Item from '../../interfaces/Item';

const mockItems: Item[] = [
    {
        name: 'Nike Air',
        wasPrice: '$90.00',
        nowPrice: '$70.00',
        discount: 22,
        url: 'https://example.com/nike',
        sizes: ['M', 'L'],
        timestamp: 1,
        gender: 'Male',
    },
    {
        name: 'Adidas Runner',
        wasPrice: '$80.00',
        nowPrice: '$55.00',
        discount: 31,
        url: 'https://example.com/adidas',
        sizes: ['S'],
        timestamp: 2,
        gender: 'Female',
    },
];

describe('ItemTable', () => {
    it('renders "Loading" message while isLoading is true', () => {
        render(<ItemTable items={[]} isLoading={true} />);
        expect(screen.getByText('Loading')).toBeInTheDocument();
    });

    it('renders "No Items Found" message when items is empty and isLoading is false', () => {
        render(<ItemTable items={[]} isLoading={false} />);
        expect(screen.getByText('Sorry!')).toBeInTheDocument();
        expect(screen.getByText('No Items Found...')).toBeInTheDocument();
    });

    it('renders the header and item count when items are provided', () => {
        render(<ItemTable items={mockItems} isLoading={false} />);
        expect(screen.getByText('Latest Picks')).toBeInTheDocument();
        expect(screen.getByText('(2)')).toBeInTheDocument();
    });

    it('renders a card for each item', () => {
        render(<ItemTable items={mockItems} isLoading={false} />);
        expect(screen.getByText('Nike Air')).toBeInTheDocument();
        expect(screen.getByText('Adidas Runner')).toBeInTheDocument();
    });

    it('renders correct count for a single item', () => {
        render(<ItemTable items={[mockItems[0]]} isLoading={false} />);
        expect(screen.getByText('(1)')).toBeInTheDocument();
    });

    it('does not render items while loading even if items are provided', () => {
        render(<ItemTable items={mockItems} isLoading={true} />);
        expect(screen.getByText('Loading')).toBeInTheDocument();
        expect(screen.queryByText('Latest Picks')).not.toBeInTheDocument();
    });
});
