import { useState } from 'react';
import { Check, ChevronsUpDown, Search, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

/**
 * ComboBox Component
 * Searchable select dropdown with native smooth scrolling
 */
export function ComboBox({
  value,
  onValueChange,
  options = [],
  placeholder = 'Select...',
  emptyText = 'No results found.',
  className,
  disabled = false,
  onAddNew,
  onSearchChange,
  searchValue,
  isLoading = false,
}) {
  const [open, setOpen] = useState(false);
  const [internalSearch, setInternalSearch] = useState('');

  // Use external search control if provided, otherwise internal
  const searchTerm = searchValue !== undefined ? searchValue : internalSearch;
  const setSearchTerm = (term) => {
    if (onSearchChange) {
      onSearchChange(term);
    } else {
      setInternalSearch(term);
    }
  };

  // Handle both string arrays and object arrays {value, label}
  const normalizedOptions = options.map(opt =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  const selectedOption = normalizedOptions.find(opt => String(opt.value) === String(value));
  const displayValue = selectedOption ? selectedOption.label : placeholder;

  // Filter options locally if not using external search handler
  const filteredOptions = onSearchChange
    ? normalizedOptions
    : normalizedOptions.filter(opt =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
      );

  return (
    <Popover open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (!newOpen && !onSearchChange) setInternalSearch('');
    }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn('w-full justify-between font-normal text-left truncate', !selectedOption && 'text-muted-foreground', className)}
        >
          <span className="truncate">{displayValue}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] min-w-[220px] p-2 bg-popover border rounded-md shadow-md z-50 pointer-events-auto"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        <div className="flex items-center border-b pb-2 mb-2 px-1">
          <Search className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
          <input
            type="text"
            className="w-full text-sm bg-transparent outline-none placeholder:text-muted-foreground"
            placeholder={`Search ${placeholder.toLowerCase()}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          />
          {searchTerm && (
            <X className="h-3.5 w-3.5 text-muted-foreground cursor-pointer shrink-0 hover:text-foreground" onClick={() => setSearchTerm('')} />
          )}
        </div>
        <div
          className="max-h-56 overflow-y-auto space-y-0.5 pr-1 touch-pan-y pointer-events-auto"
          style={{
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
          }}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
        >
          {isLoading ? (
            <div className="py-4 text-center text-xs text-muted-foreground">Searching...</div>
          ) : filteredOptions.length > 0 ? (
            filteredOptions.map((option) => {
              const isSelected = String(value) === String(option.value);
              return (
                <div
                  key={option.value}
                  className={cn(
                    'flex items-center justify-between px-2 py-1.5 text-sm rounded cursor-pointer transition-colors',
                    isSelected ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-accent hover:text-accent-foreground'
                  )}
                  onClick={() => {
                    onValueChange(option.value);
                    setOpen(false);
                    if (!onSearchChange) setInternalSearch('');
                  }}
                >
                  <span className="truncate mr-2">{option.label}</span>
                  {isSelected && <Check className="h-4 w-4 shrink-0 text-primary" />}
                </div>
              );
            })
          ) : (
            <div className="py-4 text-center text-xs text-muted-foreground">
              <p className="mb-2">{emptyText}</p>
              {onAddNew && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onAddNew();
                    setOpen(false);
                  }}
                  className="gap-2 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add New Customer
                </Button>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
