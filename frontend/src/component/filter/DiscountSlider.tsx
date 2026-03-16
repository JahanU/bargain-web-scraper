import { ChangeEvent, useState } from 'react';
import { XStack, Text } from 'tamagui';
import { useDispatch } from 'react-redux';
import { filterActions } from '../../store/filterSlice';
import { AppDispatch } from '../../store';

function DiscountSlider() {
  const dispatch = useDispatch<AppDispatch>();
  const [discount, setDiscount] = useState(10);

  const handleSlider = (event: ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseInt(event.target.value, 10);
    setDiscount(value);
    dispatch(filterActions.setDiscount(value));
  };

  return (
    <XStack gap="$2" alignItems="center" flex={1} minWidth={140}>
      <Text fontSize={12} color="$colorMuted" fontWeight="500" flexShrink={0}>
        Min:
      </Text>
      <input
        type="range"
        min={10}
        max={100}
        step={10}
        value={discount}
        onChange={handleSlider}
        className="cactus-slider"
        aria-label={`Minimum discount: ${discount}%`}
        style={{ flex: 1 }}
      />
      <Text
        fontSize={13}
        fontWeight="700"
        color="$accentBackground"
        flexShrink={0}
        minWidth={36}
        textAlign="right"
      >
        {discount}%
      </Text>
    </XStack>
  );
}

export default DiscountSlider;
