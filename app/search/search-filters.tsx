"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import type { FilterOptions } from "@/lib/data/search";
import { SearchInput } from "./search-input";

interface SearchFiltersProps {
  filterOptions: FilterOptions;
}

export function SearchFilters({ filterOptions }: SearchFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentQuery = searchParams.get("query") ?? "";
  const currentRaga = searchParams.get("raga") ?? "";
  const currentComposer = searchParams.get("composer") ?? "";
  const currentSinger = searchParams.get("singer") ?? "";
  const currentDecade = searchParams.get("decade") ?? "";
  const currentTaal = searchParams.get("taal") ?? "";
  const currentLanguage = searchParams.get("language") ?? "";
  const currentSort = searchParams.get("sort") ?? "year_desc";

  const hasFilters =
    currentQuery ||
    currentRaga ||
    currentComposer ||
    currentSinger ||
    currentDecade ||
    currentTaal ||
    currentLanguage;

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page"); // Reset pagination on filter change
      router.push(`/search?${params.toString()}`);
    },
    [router, searchParams],
  );

  const clearAll = useCallback(() => {
    router.push("/search");
  }, [router]);

  return (
    <div className="space-y-4">
      {/* Search bar with autocomplete */}
      <SearchInput
        defaultValue={currentQuery}
        onSubmit={(q) => updateParams("query", q)}
      />

      {/* Filter row */}
      <div className="flex flex-wrap gap-3">
        <FilterSelect
          label="Raga"
          value={currentRaga}
          onChange={(v) => updateParams("raga", v)}
          options={filterOptions.ragas.map((r) => ({
            label: r.name,
            value: r.slug,
          }))}
        />
        <FilterSelect
          label="Composer"
          value={currentComposer}
          onChange={(v) => updateParams("composer", v)}
          options={filterOptions.composers.map((c) => ({
            label: c.name,
            value: c.slug,
          }))}
        />
        <FilterSelect
          label="Singer"
          value={currentSinger}
          onChange={(v) => updateParams("singer", v)}
          options={filterOptions.singers.map((s) => ({
            label: s.name,
            value: s.slug,
          }))}
        />
        <FilterSelect
          label="Decade"
          value={currentDecade}
          onChange={(v) => updateParams("decade", v)}
          options={filterOptions.decades.map((d) => ({
            label: `${d}s`,
            value: d,
          }))}
        />
        {filterOptions.languages.length > 1 && (
          <FilterSelect
            label="Language"
            value={currentLanguage}
            onChange={(v) => updateParams("language", v)}
            options={filterOptions.languages.map((l) => ({
              label: l,
              value: l,
            }))}
          />
        )}
        {filterOptions.taals.length > 0 && (
          <FilterSelect
            label="Taal"
            value={currentTaal}
            onChange={(v) => updateParams("taal", v)}
            options={filterOptions.taals.map((t) => ({
              label: t.name,
              value: t.name,
            }))}
          />
        )}
        <SortSelect
          value={currentSort}
          onChange={(v) => updateParams("sort", v)}
          hasQuery={!!currentQuery}
        />
      </div>

      {/* Active filters */}
      {hasFilters && (
        <div className="flex flex-wrap items-center gap-2">
          {currentQuery && (
            <FilterChip
              label={`"${currentQuery}"`}
              onClear={() => updateParams("query", "")}
            />
          )}
          {currentRaga && (
            <FilterChip
              label={`Raga: ${filterOptions.ragas.find((r) => r.slug === currentRaga)?.name ?? currentRaga}`}
              onClear={() => updateParams("raga", "")}
            />
          )}
          {currentComposer && (
            <FilterChip
              label={`Composer: ${filterOptions.composers.find((c) => c.slug === currentComposer)?.name ?? currentComposer}`}
              onClear={() => updateParams("composer", "")}
            />
          )}
          {currentSinger && (
            <FilterChip
              label={`Singer: ${filterOptions.singers.find((s) => s.slug === currentSinger)?.name ?? currentSinger}`}
              onClear={() => updateParams("singer", "")}
            />
          )}
          {currentDecade && (
            <FilterChip
              label={`${currentDecade}s`}
              onClear={() => updateParams("decade", "")}
            />
          )}
          {currentLanguage && (
            <FilterChip
              label={`Language: ${currentLanguage}`}
              onClear={() => updateParams("language", "")}
            />
          )}
          {currentTaal && (
            <FilterChip
              label={`Taal: ${currentTaal}`}
              onClear={() => updateParams("taal", "")}
            />
          )}
          <button
            onClick={clearAll}
            className="text-xs text-neutral-500 hover:text-neutral-700"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-700 focus:border-neutral-400 focus:outline-none"
    >
      <option value="">{label}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function SortSelect({
  value,
  onChange,
  hasQuery,
}: {
  value: string;
  onChange: (value: string) => void;
  hasQuery: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="ml-auto rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-700 focus:border-neutral-400 focus:outline-none"
    >
      <option value="year_desc">Newest first</option>
      <option value="year_asc">Oldest first</option>
      <option value="title_asc">Title A-Z</option>
      {hasQuery && <option value="relevance">Relevance</option>}
    </select>
  );
}

function FilterChip({
  label,
  onClear,
}: {
  label: string;
  onClear: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700">
      {label}
      <button
        onClick={onClear}
        className="ml-0.5 text-neutral-400 hover:text-neutral-600"
      >
        &times;
      </button>
    </span>
  );
}
