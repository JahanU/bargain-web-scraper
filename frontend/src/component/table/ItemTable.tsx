import { YStack, XStack, Text, Spinner, H2 } from 'tamagui';
import ItemCard from './ItemCard';
import Item from '../../interfaces/Item';

function ItemTable({ items, isLoading }: { items: Item[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <YStack
        flex={1}
        paddingVertical="$16"
        alignItems="center"
        justifyContent="center"
        gap="$4"
      >
        <Spinner size="large" color="$accentBackground" />
        <Text fontSize={15} color="$colorMuted" fontWeight="500">
          Finding the best deals…
        </Text>
      </YStack>
    );
  }

  if (items.length === 0) {
    return (
      <YStack
        flex={1}
        paddingVertical="$16"
        alignItems="center"
        justifyContent="center"
        gap="$3"
      >
        <Text fontSize={40} textAlign="center">🌵</Text>
        <H2
          fontSize={22}
          fontWeight="700"
          color="$color11"
          fontFamily="$heading"
          textAlign="center"
        >
          No deals found
        </H2>
        <Text fontSize={14} color="$colorMuted" textAlign="center" maxWidth={280}>
          Try adjusting your filters — great bargains are out there!
        </Text>
      </YStack>
    );
  }

  return (
    <YStack
      paddingVertical="$6"
      paddingHorizontal="$6"
      gap="$4"
      width="100%"
    >
      {/* Section header */}
      <XStack alignItems="baseline" gap="$2">
        <Text
          fontFamily="$heading"
          fontSize={20}
          fontWeight="700"
          color="$color11"
        >
          Latest Picks
        </Text>
        <Text fontSize={13} color="$colorMuted">
          ({items.length} {items.length === 1 ? 'deal' : 'deals'})
        </Text>
      </XStack>

      {/* Responsive CSS grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
          gap: '14px',
        }}
      >
        {items.map((item: Item) => (
          <ItemCard key={item.url} item={item} />
        ))}
      </div>
    </YStack>
  );
}

export default ItemTable;
