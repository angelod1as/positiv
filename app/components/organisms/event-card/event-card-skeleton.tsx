// You might want to place this in a common 'skeletons' or 'ui' directory
export const EventCardSkeleton = () => {
  return (
    <div className="border border-gray-200 rounded-lg p-4 flex flex-col flex-1 animate-pulse bg-white dark:bg-gray-800 dark:border-gray-700">
      {/* CardHeader */}
      <div className="mb-4">
        <div className="flex gap-3 items-start">
          {/* Emoji */}
          <div className="w-16 h-16 bg-gray-300 dark:bg-gray-600 rounded" />
          <div className="flex-1 space-y-3">
            {/* Date */}
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/3" />
            {/* Title */}
            <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-3/4" />
          </div>
        </div>
        {/* Description */}
        <div className="mt-3 space-y-2">
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
        </div>
      </div>

      {/* CardContent */}
      <div className="grow mb-4 space-y-4">
        <div className="space-y-2">
          {/* DataPair (Valor) */}
          <div className="flex gap-2">
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/6" />
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4" />
          </div>
          {/* DataPair (Local) */}
          <div className="flex gap-2">
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/6" />
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-2/3" />
          </div>
        </div>
        {/* DateStatus */}
        <div className="space-y-2 pt-2">
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/6" />
        </div>
      </div>

      {/* CardFooter */}
      <div>
        <div className="h-10 bg-gray-300 dark:bg-gray-600 rounded w-1/2" />
      </div>
    </div>
  )
}
