import { Children, isValidElement, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

const AppSelect = ({ className = '', children, value, onChange, disabled = false }) => {
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);

  const options = useMemo(() => {
    return Children.toArray(children)
      .filter((child) => isValidElement(child) && child.type === 'option')
      .map((child) => ({
        value: child.props.value,
        label: child.props.children,
      }));
  }, [children]);

  const activeOption = useMemo(
    () => options.find((opt) => String(opt.value) === String(value)) || options[0] || null,
    [options, value],
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target)) setOpen(false);
    };

    const handleEsc = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const selectValue = (nextValue) => {
    if (typeof onChange === 'function') {
      onChange({ target: { value: nextValue } });
    }
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className="w-full rounded-xl border border-[#dfd3bf] bg-white px-3 py-2.5 pr-10 text-left text-sm font-medium text-[#4d473f] shadow-[0_1px_0_rgba(53,50,41,0.04)] outline-none transition hover:border-[#cebda3] focus:ring-2 focus:ring-[#f7d2c8] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {activeOption ? activeOption.label : 'Chọn'}
      </button>
      <ChevronDown
        size={16}
        className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8f887d] transition ${open ? 'rotate-180' : ''}`}
      />

      {open && !disabled && (
        <div className="absolute z-50 mt-2 max-h-64 w-full overflow-auto rounded-xl border border-[#dfd3bf] bg-white p-1 shadow-[0_14px_28px_rgba(53,50,41,0.16)]">
          {options.map((opt) => {
            const active = String(opt.value) === String(activeOption?.value ?? '');
            return (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => selectValue(opt.value)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                  active ? 'bg-[#8a4f41] text-white' : 'text-[#4d473f] hover:bg-[#f5eee1]'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AppSelect;
