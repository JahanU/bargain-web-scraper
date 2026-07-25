import { YStack, XStack, Text } from 'tamagui';
import DiscountSlider from './DiscountSlider';
import SortDropdown from './dropdowns/SortDropdown';
import SizeDropdown from './dropdowns/SizeDropdown';
import SearchBar from './SearchBar';

function Filters() {
  return (
    <YStack
      backgroundColor="$backgroundStrong"
      borderBottomWidth={1}
      borderBottomColor="$borderColor"
      paddingVertical="$3"
      paddingHorizontal="$4"
    >
      <XStack
        flexWrap="wrap"
        gap="$4"
        alignItems="center"
      >
        <SearchBar />
        <SortDropdown />
        <SizeDropdown />
        <DiscountSlider />
      </XStack>
    </YStack>
  );
}

export default Filters;
