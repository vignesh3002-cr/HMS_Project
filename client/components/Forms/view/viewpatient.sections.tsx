import { ReactNode, ComponentType, isValidElement } from "react";

export const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="bg-white border border-[#edf0f4] rounded-[10px] p-[21px] mb-4">
    <h2 className="text-lg font-semibold text-[#172033] mb-4">{title}</h2>
    {children}
  </section>
);

type IconProp = ComponentType<{ className?: string; strokeWidth?: string | number }> | ReactNode;

export const InfoCell = ({
  icon,
  title,
  value,
  span = 1,
}: {
  icon: IconProp;
  title: string;
  value: string;
  span?: number;
}) => {
  const IconComponent = typeof icon === "function" ? icon : null;
  const iconElement = isValidElement(icon) ? icon : null;
  return (
    <div className={span > 1 ? "col-span-2" : ""}>
      <div className="flex items-start gap-3">
        <div className="w-[23px] h-[23px] flex items-center justify-center text-gray-900 shrink-0">
          {IconComponent ? (
            <IconComponent className="w-[17px] h-[17px]" strokeWidth={1.75} aria-hidden="true" />
          ) : iconElement ? (
            <span className="w-[17px] h-[17px] flex items-center justify-center" aria-hidden="true">
              {iconElement}
            </span>
          ) : null}
        </div>
        <div className="flex flex-col gap-[3px]">
          <strong className="text-xs font-bold text-[#222938]">{title}</strong>
          <span className="text-[#6d7480] text-xs leading-[18px]">{value}</span>
        </div>
      </div>
    </div>
  );
};