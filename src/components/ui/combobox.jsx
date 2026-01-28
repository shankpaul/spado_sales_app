import { useState } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

/**
 * ComboBox Component
 * Searchable select dropdown
 */
export function ComboBox({ 
  value, 
  onValueChange, 
  options = [], 
  placeholder = 'Select...', 
  emptyText = 'No results found.', 
  className, 
  onAddNew,
  onSearchChange,
  searchValue,
  isLoading = false,
}) {
  const [open, setOpen] = useState(false);
  const [internalSearch, setInternalSearch] = useState('');

  // Use external search control if provided, otherwise internal
  const searchTerm = searchValue !== undefined ? searchValue : internalSearch;
  const handleSearchChange = onSearchChange || setInternalSearch;

  // Handle both string arrays and object arrays {value, label}
  const normalizedOptions = options.map(opt => 
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  const selectedOption = normalizedOptions.find(opt => opt.value === value);
  const displayValue = selectedOption ? selectedOption.label : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between', className)}
        >
          {displayValue}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={!onSearchChange}>
          <CommandInput 
            placeholder={`Search ${placeholder.toLowerCase()}...`}
            value={searchTerm}
            onValueChange={handleSearchChange}
          />
          <CommandList>
            <CommandEmpty>
              <div className="py-6 text-center text-sm">
                {isLoading ? (
                  <p className="text-muted-foreground">Searching...</p>
                ) : (
                  <>
                    <p className="text-muted-foreground mb-3">{emptyText}</p>
                    {onAddNew && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          onAddNew();
                          setOpen(false);
                        }}
                        className="gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Add New Customer
                      </Button>
                    )}
                  </>
                )}
              </div>
            </CommandEmpty>
            <CommandGroup>
              {normalizedOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onValueChange(option.value === value ? '' : option.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === option.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
