export default function WelcomeStep({ onNext }) {
  return (
    <div className="text-center space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">
        Welcome 👋
      </h1>

      <p className="text-gray-500">
        Let's set up your restaurant system in a few steps
      </p>

      <button onClick={onNext} className="btn-primary w-full">
        Start Setup
      </button>
    </div>
  );
}