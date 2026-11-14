import { CATEGORY_SCOPES, type CategoryScope } from "@/features/deals";
import { SegmentedRadio } from "./SegmentedRadio";

const OPTIONS = CATEGORY_SCOPES.map((category) => ({ value: category, label: category }));

type CategoryControlProps = {
  value: CategoryScope;
  onChange: (value: CategoryScope) => void;
  className?: string;
};

export function CategoryControl(props: CategoryControlProps) {
  return <SegmentedRadio legend="Category" name="category" options={OPTIONS} {...props} />;
}
