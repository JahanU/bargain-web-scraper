import { GENDER_LABEL, GENDERS, type Gender } from "@/features/deals";
import { cn } from "@/shared/lib/cn";

type GenderControlProps = {
  value: Gender;
  onChange: (value: Gender) => void;
  className?: string;
};

/** Native radios styled as a segmented control, like DiscountControl. */
export function GenderControl({ value, onChange, className }: GenderControlProps) {
  return (
    <fieldset
      className={cn("grid grid-cols-3 overflow-hidden rounded-sm border border-border", className)}
    >
      <legend className="sr-only">Shop</legend>
      {GENDERS.map((gender) => (
        <label key={gender} className="relative">
          <input
            type="radio"
            name="gender"
            value={gender}
            checked={value === gender}
            onChange={() => onChange(gender)}
            className="peer absolute inset-0 appearance-none"
          />
          <span
            className={cn(
              "flex h-11 cursor-pointer items-center justify-center text-sm font-semibold transition-colors duration-fast sm:h-8 sm:px-3 sm:text-xs",
              "peer-checked:bg-accent peer-checked:text-accent-fg peer-focus-visible:outline-2 peer-focus-visible:-outline-offset-2 peer-focus-visible:outline-focus",
              "hover:bg-surface-sunken peer-checked:hover:bg-accent",
            )}
          >
            {GENDER_LABEL[gender]}
          </span>
        </label>
      ))}
    </fieldset>
  );
}
