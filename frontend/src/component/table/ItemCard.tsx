import { YStack, XStack, Text, Card } from 'tamagui';
import Item from '../../interfaces/Item';

interface ItemCardProps {
  item: Item;
}

function ItemCard({ item }: ItemCardProps) {
  const sizes = item.sizes?.join(', ') ?? '';

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noreferrer"
      style={{ textDecoration: 'none', display: 'contents' }}
    >
      <Card
        borderRadius="$3"
        borderWidth={1}
        borderColor="$borderColor"
        backgroundColor="$background"
        overflow="hidden"
        elevation={0}
        flex={1}
        hoverStyle={{
          borderColor: '$borderColorHover',
          shadowColor: '$shadowColorHover',
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 8 },
          elevation: 4,
          y: -3,
        }}
        pressStyle={{ scale: 0.98, y: 0 }}
        cursor="pointer"
      >
      {/* Product image */}
      <YStack
          backgroundColor="$backgroundStrong"
          overflow="hidden"
          aspectRatio={1}
          position="relative"
        >
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.name}
              loading="lazy"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center top',
                display: 'block',
              }}
            />
          ) : (
            <XStack flex={1} alignItems="center" justifyContent="center">
              <Text fontSize={32} color="$colorMuted">🛍</Text>
            </XStack>
          )}

          {/* Discount badge */}
          {item.discount > 0 && (
            <XStack
              position="absolute"
              top="$2"
              right="$2"
              backgroundColor="$accentBackground"
              borderRadius="$full"
              paddingHorizontal="$2"
              paddingVertical="$1"
            >
              <Text fontSize={11} fontWeight="700" color="white">
                -{item.discount}%
              </Text>
            </XStack>
          )}
        </YStack>

        {/* Card body */}
        <YStack padding="$3" gap="$1" flex={1} minHeight={120}>
          {/* Product name */}
          <Text
            fontSize={13}
            fontWeight="600"
            color="$color11"
            numberOfLines={2}
            style={{ lineHeight: '1.3' } as any}
          >
            {item.name}
          </Text>

          {/* Metadata */}
          <XStack gap="$1" flexWrap="wrap" alignItems="center">
            <Text fontSize={11} color="$colorMuted">{item.gender}</Text>
            {sizes && (
              <>
                <Text fontSize={11} color="$borderColor">·</Text>
                <Text fontSize={11} color="$colorMuted" numberOfLines={1}>{sizes}</Text>
              </>
            )}
          </XStack>

          {/* Price row */}
          <XStack alignItems="baseline" gap="$2" marginTop="$1">
            <Text fontSize={15} fontWeight="700" color="$accentBackground">
              {item.nowPrice}
            </Text>
            {item.wasPrice && (
              <Text fontSize={11} color="$colorMuted" textDecorationLine="line-through">
                {item.wasPrice}
              </Text>
            )}
          </XStack>
        </YStack>
      </Card>
    </a>
  );
}

export default ItemCard;
