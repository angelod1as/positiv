export const ParticipantsTableSkeleton = () => {
  return (
    <div
      data-testid="participants-table-skeleton"
      aria-busy="true"
      aria-live="polite"
      className="animate-pulse space-y-4"
    >
      <div className="flex justify-between items-center mb-4">
        <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-32" />
        <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-64" />
      </div>

      <div className="border border-gray-200 dark:border-gray-700 rounded">
        <div className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-6 gap-4 p-4">
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded" />
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded" />
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded" />
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded" />
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded" />
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded" />
          </div>
        </div>

        {[...Array(8)].map((_, index) => (
          <div
            key={index}
            className="grid grid-cols-6 gap-4 p-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0"
          >
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center mt-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48" />
        <div className="flex gap-2">
          <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-20" />
          <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-20" />
        </div>
      </div>
    </div>
  )
}
