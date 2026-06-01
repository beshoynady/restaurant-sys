/**
 * ==========================================
 * Branch Address Card
 * ------------------------------------------
 * Displays branch address information.
 * ==========================================
 */

export default function BranchAddressCard() {
  const address = {
    country: "Egypt",
    city: "Cairo",
    area: "Nasr City",
    street: "Makram Ebeid",
    postalCode: "11765",
  };

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <h3 className="mb-6 text-lg font-bold">Address Information</h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <AddressItem title="Country" value={address.country} />

        <AddressItem title="City" value={address.city} />

        <AddressItem title="Area" value={address.area} />

        <AddressItem title="Street" value={address.street} />

        <AddressItem title="Postal Code" value={address.postalCode} />
      </div>
    </div>
  );
}

function AddressItem({ title, value }) {
  return (
    <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
      <p className="text-xs text-gray-500">{title}</p>

      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}
