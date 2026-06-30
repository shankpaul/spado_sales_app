import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from './ui/drawer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Car } from 'lucide-react';
import VehicleIcon from './VehicleIcon';
import { getBrands, getModelsByBrand, getVehicleType, vehicleData } from '../lib/vehicleData';
import { toast } from 'sonner';

// Levenshtein distance helper for fuzzy matching
const getLevenshteinDistance = (a, b) => {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          )
        );
      }
    }
  }
  return matrix[b.length][a.length];
};

const VehicleIdentifier = ({
  open,
  onOpenChange,
  onApply,
  title = "Identify Vehicle Type",
  description = "Select or search the vehicle brand and model to identify its type category."
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [identifiedType, setIdentifiedType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Reset local state when dialog is closed/opened
  useEffect(() => {
    if (!open) {
      setSelectedBrand('');
      setSelectedModel('');
      setIdentifiedType('');
      setSearchQuery('');
      setSuggestions([]);
    }
  }, [open]);

  // Flatten vehicle database for easy search
  const flattenedVehicles = useMemo(() => {
    const list = [];
    vehicleData.forEach(v => {
      v.models.forEach(m => {
        list.push({
          brand: v.brand,
          model: m.name,
          fullName: `${v.brand} ${m.name}`,
          type: m.type
        });
      });
    });
    return list;
  }, []);

  // Suggest matches on search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }

    // Ignore suggestions if the search matches exactly a selected model
    if (selectedModel && searchQuery.toLowerCase().includes(selectedModel.toLowerCase())) {
      setSuggestions([]);
      return;
    }

    const cleanQuery = searchQuery.toLowerCase().trim();
    const substringMatches = [];
    const fuzzyMatches = [];

    flattenedVehicles.forEach(item => {
      const brandLower = item.brand.toLowerCase();
      const modelLower = item.model.toLowerCase();
      const fullNameLower = item.fullName.toLowerCase();

      if (fullNameLower.includes(cleanQuery) || brandLower.includes(cleanQuery) || modelLower.includes(cleanQuery)) {
        substringMatches.push({ ...item, score: 0 });
      } else {
        const distModel = getLevenshteinDistance(cleanQuery, modelLower);
        const distFull = getLevenshteinDistance(cleanQuery, fullNameLower);
        const minDistance = Math.min(distModel, distFull);

        // Allow distance up to half of name length or 3 chars
        const maxAllowed = Math.max(3, Math.floor(fullNameLower.length / 2));
        if (minDistance <= maxAllowed) {
          fuzzyMatches.push({ ...item, score: minDistance });
        }
      }
    });

    substringMatches.sort((a, b) => {
      const aStarts = a.fullName.toLowerCase().startsWith(cleanQuery);
      const bStarts = b.fullName.toLowerCase().startsWith(cleanQuery);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return a.fullName.length - b.fullName.length;
    });

    fuzzyMatches.sort((a, b) => a.score - b.score);

    setSuggestions([...substringMatches, ...fuzzyMatches].slice(0, 5));
  }, [searchQuery, flattenedVehicles, selectedModel]);

  const handleSelectSuggestion = (suggestion) => {
    setSelectedBrand(suggestion.brand);
    setSelectedModel(suggestion.model);
    setIdentifiedType(suggestion.type.toLowerCase());
    setSearchQuery(suggestion.fullName);
    setSuggestions([]);
  };

  const handleIdentify = () => {
    // If search query is typed and no suggestion was selected, run closest matching
    if (searchQuery.trim() && !identifiedType) {
      if (suggestions.length > 0) {
        const bestMatch = suggestions[0];
        setSelectedBrand(bestMatch.brand);
        setSelectedModel(bestMatch.model);
        setIdentifiedType(bestMatch.type.toLowerCase());
        setSearchQuery(bestMatch.fullName);
        setSuggestions([]);
        toast.success(`Closest match identified: ${bestMatch.fullName} (${bestMatch.type})`);
        return;
      }
    }

    if (selectedBrand && selectedModel) {
      const type = getVehicleType(selectedBrand, selectedModel);
      if (type) {
        setIdentifiedType(type.toString().toLowerCase());
      } else {
        setIdentifiedType('unknown');
      }
    } else {
      toast.error('Please type a search query or select brand & model');
    }
  };

  const handleReset = () => {
    setSelectedBrand('');
    setSelectedModel('');
    setIdentifiedType('');
    setSearchQuery('');
    setSuggestions([]);
  };

  const handleAction = () => {
    const type = getVehicleType(selectedBrand, selectedModel) || identifiedType;
    if (onApply && type) {
      onApply(type.toString().toLowerCase(), selectedBrand, selectedModel);
      toast.success(`Vehicle identified as ${type}`);
    }
    onOpenChange(false);
  };

  const renderContent = () => {
    return (
      <div className="space-y-4 py-4 px-4 sm:px-0">
        {/* Quick Search */}
        <div className="space-y-2 relative">
          <Label htmlFor="search">Quick Search (Auto-Suggest)</Label>
          <Input
            id="search"
            placeholder="Type vehicle brand or model (e.g. Creta, swift)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-white border-gray-200"
          />
          {suggestions.length > 0 && (
            <div className="absolute z-50 left-0 right-0 mt-1 border border-gray-200 rounded-lg overflow-hidden bg-white shadow-lg divide-y divide-gray-100 max-h-60 overflow-y-auto">
              {suggestions.map((suggestion) => (
                <button
                  key={`${suggestion.brand}-${suggestion.model}`}
                  type="button"
                  onClick={() => handleSelectSuggestion(suggestion)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-primary-50/50 flex items-center justify-between text-gray-700 transition-colors"
                >
                  <div>
                    <span className="font-semibold text-gray-900">{suggestion.brand}</span>
                    <span className="text-gray-500 ml-1.5">{suggestion.model}</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full font-medium uppercase">
                    {suggestion.type}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 my-2 text-xs text-gray-400 font-semibold uppercase">
          <span className="h-px bg-gray-100 flex-1"></span>
          <span>Or Select Manually</span>
          <span className="h-px bg-gray-100 flex-1"></span>
        </div>

        {/* Manual Brand Dropdown */}
        <div className="space-y-2">
          <Label htmlFor="brand">Brand</Label>
          <Select value={selectedBrand} onValueChange={(value) => {
            setSelectedBrand(value);
            setSelectedModel('');
            setIdentifiedType('');
          }}>
            <SelectTrigger id="brand">
              <SelectValue placeholder="Select brand" />
            </SelectTrigger>
            <SelectContent>
              {getBrands().map((brand) => (
                <SelectItem key={brand} value={brand}>{brand}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Manual Model Dropdown */}
        {selectedBrand && (
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Select value={selectedModel} onValueChange={(value) => {
              setSelectedModel(value);
              setIdentifiedType('');
            }}>
              <SelectTrigger id="model">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {getModelsByBrand(selectedBrand).map((model) => (
                  <SelectItem key={model.name} value={model.name}>{model.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {identifiedType && (
          <div className="p-4 rounded-lg bg-blue-50 border border-primary/20">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-primary">Identified Type</span>
                </div>
                <p className="text-2xl font-bold text-primary uppercase">{identifiedType}</p>
              </div>
              <VehicleIcon vehicleType={identifiedType} size={82} />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {!identifiedType ? (
            <>
              <Button
                onClick={handleIdentify}
                className="flex-1"
                disabled={(!selectedBrand || !selectedModel) && !searchQuery.trim()}
              >
                Identify
              </Button>
              <Button variant="outline" onClick={handleReset} className="flex-1">
                Reset
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleReset} className="flex-1">
                Reset
              </Button>
              {onApply ? (
                <Button onClick={handleAction} className="flex-1">
                  Apply Type
                </Button>
              ) : (
                <Button onClick={() => onOpenChange(false)} className="flex-1">
                  Close
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="px-4 text-left">
            <DrawerTitle className="flex items-center gap-2">
              <Car className="h-5 w-5 text-primary" />
              {title}
            </DrawerTitle>
            <DrawerDescription>
              {description}
            </DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto pb-6">
            {renderContent()}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md animate-in fade-in zoom-in duration-200">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
};

export default VehicleIdentifier;
