import SectionCard from "../../../../shared/ui/layout/SectionCard";

export default function PoliciesSection({ settings, updateSettings }) {
  const toggle = (key) => {
    updateSettings(key, !settings[key]);
  };

  const items = [
    ["usesReservationSystem", "Reservation System"],
    ["offersCurbsidePickup", "Curbside Pickup"],
    ["offersOnlinePayment", "Online Payment"],
    ["offersCashOnDelivery", "Cash on Delivery"],
    ["hasLoyaltyProgram", "Loyalty Program"],
    ["supportsGiftCards", "Gift Cards"],
    ["supportsReferrals", "Referrals"],
  ];

  return (
    <SectionCard title="Policies & Services">
      <div className="space-y-3">
        {items.map(([key, label]) => (
          <label key={key} className="flex items-center justify-between">
            <span>{label}</span>

            <input
              type="checkbox"
              checked={settings[key]}
              onChange={() => toggle(key)}
            />
          </label>
        ))}
      </div>
    </SectionCard>
  );
}
