"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Suggestion } from "@/lib/data/search";

interface SearchInputProps {
  defaultValue: string;
  onSubmit: (query: string) => void;
}

export function SearchInput({ defaultValue, onSubmit }: SearchInputProps) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }
    try {
      const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data);
        setIsOpen(data.length > 0);
        setActiveIndex(-1);
      }
    } catch {
      // Silently fail — autocomplete is non-critical
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, fetchSuggestions]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === "Enter") {
        onSubmit(value);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1,
        );
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0) {
          router.push(`/songs/${suggestions[activeIndex].slug}`);
          setIsOpen(false);
        } else {
          onSubmit(value);
          setIsOpen(false);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setActiveIndex(-1);
        break;
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        placeholder="Search by song title..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (suggestions.length > 0) setIsOpen(true);
        }}
        className="w-full rounded-lg border border-neutral-200 px-4 py-2.5 text-sm placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
        role="combobox"
        aria-expanded={isOpen}
        aria-autocomplete="list"
        aria-activedescendant={
          activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined
        }
      />
      {isOpen && suggestions.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 max-h-80 w-full overflow-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg"
        >
          {suggestions.map((s, i) => (
            <li
              key={s.slug}
              id={`suggestion-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              className={`cursor-pointer px-4 py-2 text-sm ${
                i === activeIndex
                  ? "bg-neutral-100 text-neutral-900"
                  : "text-neutral-700 hover:bg-neutral-50"
              }`}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => {
                router.push(`/songs/${s.slug}`);
                setIsOpen(false);
              }}
            >
              <span className="font-medium">{s.title}</span>
              {(s.filmTitle || s.year) && (
                <span className="ml-2 text-neutral-400">
                  {s.filmTitle && s.filmTitle}
                  {s.filmTitle && s.year && " "}
                  {s.year && `(${s.year})`}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
