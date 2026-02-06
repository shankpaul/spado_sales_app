import { cn } from '@/lib/utils';

/**
 * LetterAvatar Component
 * Creates an avatar with the first letter of the provided name
 * 
 * @param {string} name - The name to extract the first letter from
 * @param {string} size - Size variant: 'sm', 'md', 'lg', 'xl' (default: 'md')
 * @param {string} className - Additional CSS classes
 */
const LetterAvatar = ({ name, size = 'md', className }) => {
  // Get first letter, fallback to '?'
  const letter = name?.trim().charAt(0).toUpperCase() || '?';

  // Generate consistent color based on name
  const getColorFromName = (str) => {
    if (!str) return 'bg-gray-500';
    
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-indigo-500',
      'bg-teal-500',
      'bg-orange-500',
      'bg-cyan-500',
    ];
    
    // Generate index based on first letter
    const charCode = str.charCodeAt(0);
    const index = charCode % colors.length;
    return colors[index];
  };

  // Size variants
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-2xl',
  };

  const gradientColor = getColorFromName(name);
  const sizeClass = sizeClasses[size] || sizeClasses.md;

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0',
        gradientColor,
        sizeClass,
        className
      )}
      title={name}
    >
      {letter}
    </div>
  );
};

export default LetterAvatar;
