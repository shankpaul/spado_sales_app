import { Check } from 'lucide-react';

/**
 * AssigneeResponseTick Component
 * Displays visual indicator for assignee response status
 * 
 * @param {string} status - assignee_response value (waiting, received, accepted)
 * @param {string} size - Size of the ticks: 'xs', 'sm', 'md' (default: 'sm')
 */
const AssigneeResponseTick = ({ status, size = 'sm' }) => {
  if (!status || status === 'waiting') {
    // Single tick in gray
    return (
      <div className="flex items-center">
        <Check className={`${getSizeClass(size)} text-gray-400`} strokeWidth={2.5} />
      </div>
    );
  }

  if (status === 'received') {
    // Double tick in gray
    return (
      <div className="flex items-center relative">
        <Check className={`${getSizeClass(size)} text-gray-400`} strokeWidth={2.5} />
        <Check className={`${getSizeClass(size)} text-gray-400 -ml-2`} strokeWidth={2.5} />
      </div>
    );
  }

  if (status === 'accepted') {
    // Double tick in blue
    return (
      <div className="flex items-center relative">
        <Check className={`${getSizeClass(size)} text-blue-500`} strokeWidth={2.5} />
        <Check className={`${getSizeClass(size)} text-blue-500 -ml-2`} strokeWidth={2.5} />
      </div>
    );
  }

  // Default: single tick in gray
  return (
    <div className="flex items-center">
      <Check className={`${getSizeClass(size)} text-gray-400`} strokeWidth={2.5} />
    </div>
  );
};

// Helper function to get size class
const getSizeClass = (size) => {
  switch (size) {
    case 'xs':
      return 'h-3 w-3';
    case 'sm':
      return 'h-3.5 w-3.5';
    case 'md':
      return 'h-4 w-4';
    default:
      return 'h-3.5 w-3.5';
  }
};

export default AssigneeResponseTick;
