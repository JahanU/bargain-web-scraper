import { STORE_LABEL, STORE_SCOPES, type StoreScope } from "@/features/deals";
import { SegmentedRadio } from "./SegmentedRadio";

const OPTIONS = STORE_SCOPES.map((store) => ({
  value: store,
  label: store === "all" ? "All" : STORE_LABEL[store],
}));

type StoreControlProps = {
  value: StoreScope;
  onChange: (value: StoreScope) => void;
  className?: string;
};

export function StoreControl(props: StoreControlProps) {
  return <SegmentedRadio legend="Store" name="store" options={OPTIONS} {...props} />;
}
