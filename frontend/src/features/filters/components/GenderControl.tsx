import { GENDER_LABEL, GENDERS, type Gender } from "@/features/deals";
import { SegmentedRadio } from "./SegmentedRadio";

const OPTIONS = GENDERS.map((gender) => ({ value: gender, label: GENDER_LABEL[gender] }));

type GenderControlProps = { value: Gender; onChange: (value: Gender) => void; className?: string };

export function GenderControl(props: GenderControlProps) {
  return <SegmentedRadio legend="Shop" name="gender" options={OPTIONS} {...props} />;
}
