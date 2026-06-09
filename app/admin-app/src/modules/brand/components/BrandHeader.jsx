export default function BrandHeader({
  formData,
  isEditing,
  startEditing,
  cancelEditing,
  saveChanges,
}) {
  return (
    <div className="rounded-3xl bg-surface border border-border text-foreground shadow-sm p-6">
      <div className="flex flex-col lg:flex-row gap-6 items-center">
        <img
          src={formData.logo}
          alt="brand"
          className="w-32 h-32 rounded-3xl object-cover border"
        />

        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">
            {formData.name.EN}
          </h1>

          <p className="text-slate-500 mt-2">
            Restaurant Management
            System
          </p>

          <div className="flex flex-wrap gap-3 mt-5">
            <span className="px-4 py-2 rounded-full bg-green-100 text-green-700 text-sm font-medium">
              {formData.status}
            </span>

            <span className="px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
              {formData.setupStatus}
            </span>

            <span className="px-4 py-2 rounded-full bg-slate-100 text-slate-700 text-sm font-medium">
              {formData.maxBranches}
              {" "}
              Branches
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          {!isEditing ? (
            <button
              onClick={startEditing}
              className="px-5 py-3 rounded-xl border border-slate-300 hover:bg-slate-100"
            >
              Edit
            </button>
          ) : (
            <>
              <button
                onClick={cancelEditing}
                className="px-5 py-3 rounded-xl border border-slate-300 hover:bg-slate-100"
              >
                Cancel
              </button>

              <button
                onClick={saveChanges}
                className="px-5 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700"
              >
                Save Changes
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}