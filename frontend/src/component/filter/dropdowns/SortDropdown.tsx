import { useState } from 'react';
import { YStack, XStack, Text, Button, AnimatePresence } from 'tamagui';
import { useFilterParams } from '../../../hooks/useFilterParams';
import { Sort } from '../../../interfaces/Sort';

interface SortOption {
  id: Sort;
  label: string;
}

const sortOptions: SortOption[] = [
  { id: Sort.discountHighToLow, label: 'Discount ↓' },
  { id: Sort.discountLowToHigh, label: 'Discount ↑' },
  { id: Sort.priceHighToLow, label: 'Price ↓' },
  { id: Sort.priceLowToHigh, label: 'Price ↑' },
];

export default function SortDropdown() {
  const { sort, setSort } = useFilterParams();
  const [open, setOpen] = useState(false);

  const selectedLabel = sortOptions.find((o) => o.id === sort)?.label ?? 'Sort';

  return (
    <YStack position="relative">
      {/* Trigger */}
      <Button
        size="$4"
        backgroundColor="$background"
        borderWidth={1}
        borderColor="$borderColor"
        borderRadius="$3"
        paddingHorizontal="$5"
        hoverStyle={{ backgroundColor: '$backgroundHover', borderColor: '$borderColorHover' }}
        pressStyle={{ backgroundColor: '$backgroundPress' }}
        onPress={() => setOpen(!open)}
        aria-haspopup="listbox"
      >
        <XStack alignItems="center" gap="$2">
          <Text fontSize={13} color="$colorMuted" fontWeight="500">Sort:</Text>
          <Text fontSize={13} color="$color11" fontWeight="600">{selectedLabel}</Text>
          <Text
            fontSize={10}
            color="$colorMuted"
            style={{
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 150ms ease',
            } as any}
          >
            ▾
          </Text>
        </XStack>
      </Button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <YStack
            key="sort-dropdown"
            opacity={1}
            y={0}
            scale={1}
            animation="quick"
            enterStyle={{ opacity: 0, y: -4, scale: 0.98 }}
            exitStyle={{ opacity: 0, y: -4, scale: 0.98 }}
            position="absolute"
            top="100%"
            left={0}
            minWidth={160}
            marginTop="$1"
            backgroundColor="$background"
            borderWidth={1}
            borderColor="$borderColor"
            borderRadius="$3"
            overflow="hidden"
            zIndex={200}
            shadowColor="$shadowColor"
            shadowRadius={12}
            shadowOffset={{ width: 0, height: 4 }}
          >
            {sortOptions.map((option) => {
              const isActive = sort === option.id;
              return (
                <XStack
                  key={option.id}
                  paddingHorizontal="$3"
                  paddingVertical="$2"
                  alignItems="center"
                  justifyContent="space-between"
                  backgroundColor={isActive ? '$cactusSubtle' : 'transparent'}
                  hoverStyle={{ backgroundColor: '$backgroundHover' }}
                  pressStyle={{ backgroundColor: '$backgroundPress' }}
                  cursor="pointer"
                  onPress={() => {
                    setSort(option.id);
                    setOpen(false);
                  }}
                >
                  <Text
                    fontSize={13}
                    color={isActive ? '$accentBackground' : '$color11'}
                    fontWeight={isActive ? '600' : '400'}
                  >
                    {option.label}
                  </Text>
                  {isActive && <Text fontSize={12} color="$accentBackground">✓</Text>}
                </XStack>
              );
            })}
          </YStack>
        )}
      </AnimatePresence>
    </YStack>
  );
}
