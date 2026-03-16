import { XStack, Input } from 'tamagui';
import { useFilterParams } from '../../hooks/useFilterParams';

function SearchBar() {
  const { search, setSearch } = useFilterParams();

  return (
    <XStack flex={1} minWidth={220} position="relative" alignItems="center">
      <Input
        id="search-input"
        value={search}
        onChangeText={setSearch}
        placeholder="🔍  Search items, brands…"
        placeholderTextColor="$placeholderColor"
        backgroundColor="$background"
        borderWidth={1}
        borderColor="$borderColor"
        borderRadius="$3"
        paddingHorizontal="$4"
        paddingVertical="$2"
        fontSize={14}
        color="$color11"
        width="100%"
        hoverStyle={{
          borderColor: '$borderColorHover',
        }}
        focusStyle={{
          borderColor: '$borderColorFocus',
          outlineColor: '$borderColorFocus',
          outlineWidth: 2,
          outlineStyle: 'solid',
          outlineOffset: 0,
        }}
      />
    </XStack>
  );
}

export default SearchBar;
