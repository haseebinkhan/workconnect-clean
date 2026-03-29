export default function BookingStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    accepted: "bg-blue-100 text-blue-700",
    in_progress: "bg-indigo-100 text-indigo-700",
    worker_marked_done: "bg-purple-100 text-purple-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };

  const labelMap: Record<string, string> = {
    pending: "Pending",
    accepted: "Accepted",
    in_progress: "In Progress",
    worker_marked_done: "Worker Done",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
        styles[status] || "bg-gray-100 text-gray-700"
      }`}
    >
      {labelMap[status] || status}
    </span>
  );
}

