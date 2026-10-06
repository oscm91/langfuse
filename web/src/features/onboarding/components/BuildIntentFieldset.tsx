import type { ReactNode } from "react";
import { Checkbox } from "@/src/components/design-system/Checkbox/Checkbox";
import {
  BUILD_INTENT_MAX_SELECTIONS,
  EXCLUSIVE_BUILD_INTENT,
  OTHER_BUILD_INTENT,
  toggleBuildIntent,
  type BuildIntentId,
  type BuildIntentOption,
} from "../lib/buildIntent";

type BuildIntentFieldsetProps = {
  options: BuildIntentOption[];
  value: BuildIntentId[];
  onChange: (value: BuildIntentId[]) => void;
  // Rendered under "Other" while it is picked.
  children: ReactNode;
};

/**
 * Temporary onboarding question (see `lib/buildIntent.ts` for the reasoning):
 * up to three picks, "Just exploring" exclusive and always enabled.
 *
 * @example
 * <BuildIntentFieldset options={options} value={value} onChange={onChange}>
 *   <Input {...form.register("buildIntentOther")} />
 * </BuildIntentFieldset>
 */
export function BuildIntentFieldset({
  options,
  value,
  onChange,
  children,
}: BuildIntentFieldsetProps) {
  const isAtLimit = value.length >= BUILD_INTENT_MAX_SELECTIONS;

  return (
    <fieldset>
      {/* A legend only names the fieldset as its direct first child. */}
      <legend className="text-xl font-bold">
        What will you use Langfuse for?
      </legend>
      <div className="mt-1 flex flex-col gap-3">
        <p className="text-muted-foreground text-sm">
          Pick up to {BUILD_INTENT_MAX_SELECTIONS}
        </p>
        {options.map((option) => {
          const isChecked = value.includes(option.id);
          const checkboxId = `build-intent-${option.id}`;

          return (
            <div key={option.id} className="flex flex-col gap-2">
              <div className="flex items-start gap-3">
                <div className="pt-0.5">
                  <Checkbox
                    id={checkboxId}
                    checked={isChecked}
                    disabled={
                      !isChecked &&
                      isAtLimit &&
                      option.id !== EXCLUSIVE_BUILD_INTENT
                    }
                    onCheckedChange={(checked) =>
                      onChange(
                        toggleBuildIntent(value, option.id, checked === true),
                      )
                    }
                  />
                </div>
                <label
                  htmlFor={checkboxId}
                  className="flex cursor-pointer flex-col"
                >
                  <span className="text-sm">{option.label}</span>
                  {option.hint ? (
                    <span className="text-muted-foreground text-sm">
                      {option.hint}
                    </span>
                  ) : null}
                </label>
              </div>
              {option.id === OTHER_BUILD_INTENT && isChecked ? (
                <div className="pl-7">{children}</div>
              ) : null}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
