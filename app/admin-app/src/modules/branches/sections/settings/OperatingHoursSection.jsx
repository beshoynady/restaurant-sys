import SectionCard from "../../../../shared/ui/layout/SectionCard";

import DayCard from "./operating/DayCard";

export default function OperatingHoursSection({
  settings,
  updateSettings,
}) {
  const days = [
    "Saturday",
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
  ];

  const operatingHours =
    settings.operatingHours || [];

  const updateDay = (dayData) => {
    const updated = [...operatingHours];

    const index = updated.findIndex(
      (d) => d.day === dayData.day
    );

    if (index === -1) {
      updated.push(dayData);
    } else {
      updated[index] = dayData;
    }

    updateSettings("operatingHours", updated);
  };

  return (
    <SectionCard title="Operating Hours">

      <div className="space-y-4">

        {days.map((day) => {
          const data =
            operatingHours.find(
              (d) => d.day === day
            ) || {
              day,
              status: "open",
              periods: [],
            };

          return (
            <DayCard
              key={day}
              data={data}
              onChange={updateDay}
            />
          );
        })}

      </div>

    </SectionCard>
  );
}
