import './App.css';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { YStack } from 'tamagui';
import ItemTable from './component/table/ItemTable';
import HeaderBar from './component/header/HeaderBar';
import ErrorState from './component/modal/Error';
import Filters from './component/filter/Filters';
import { applyItemFilters } from './util/sort';
import { RootState } from './store';
import { useItems } from './hooks/useItems';
import { useFilterParams } from './hooks/useFilterParams';

export default function App() {
  const { items, isLoading, isError } = useItems();
  const { search, sort, sizes } = useFilterParams();
  const discount = useSelector((state: RootState) => state.filterStore.discount);

  const filteredItems = useMemo(
    () =>
      applyItemFilters(items, {
        search,
        minDiscount: discount,
        sizes,
        sort,
      }),
    [items, search, discount, sizes, sort]
  );

  return (
    <YStack minHeight="100vh" backgroundColor="$background">
      <HeaderBar />
      {isError && <ErrorState />}
      {!isError && <Filters />}
      {!isError && <ItemTable items={filteredItems} isLoading={isLoading} />}
    </YStack>
  );
}
