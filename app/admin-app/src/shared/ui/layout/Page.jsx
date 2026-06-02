/**
 * Page wrapper for all modules
 */

export default function Page({ children }) {
  return (
    <div className="min-h-screen bg-background p-6">
      {children}
    </div>
  );
}