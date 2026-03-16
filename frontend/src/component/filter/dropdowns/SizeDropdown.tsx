import { XStack, Button, Text } from 'tamagui';
import { useFilterParams } from '../../../hooks/useFilterParams';

const AVAILABLE_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

export default function SizeDropdown() {
  const { sizes, toggleSize } = useFilterParams();

  return (
    <XStack gap="$1" flexWrap="wrap" alignItems="center">
      {AVAILABLE_SIZES.map((size) => {
        const isActive = sizes.includes(size);
        return (
          <Button
            key={size}
            size="$4"
            paddingHorizontal="$5"
            borderRadius="$2"
            backgroundColor={isActive ? '$cactusMid' : '$background'}
            borderColor={isActive ? '$cactusDark' : '$sandBorder'}
            borderWidth={1}
            hoverStyle={{
              backgroundColor: isActive ? '$cactusDark' : '$backgroundHover',
              borderColor: isActive ? '$cactusDark' : '$borderColorHover',
            }}
            pressStyle={{ scale: 0.95 }}
            onPress={() => toggleSize(size)}
          >
            <Text
              color={isActive ? 'white' : '$color11'}
              fontWeight={isActive ? '600' : '400'}
              fontSize={12}
            >
              {size}
            </Text>
          </Button>
        );
      })}
    </XStack>
  );
}
