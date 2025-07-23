import React, { useEffect, useState } from "react";
import {
  Sort as HeadlessSort,
  SortBy,
  SortCriterion,
} from "@coveo/headless/commerce";
import "../summary/summary-sort.css";

interface ISortProps {
  controller: HeadlessSort;
}

export default function Sort(props: ISortProps) {
  const { controller } = props;

  const [state, setState] = useState(controller.state);

  useEffect(() => {
    controller.subscribe(() => setState(controller.state));
  }, [controller]);

  if (state.availableSorts.length === 0) {
    return null;
  }

  const getSortLabel = (criterion: SortCriterion) => {
    switch (criterion.by) {
      case SortBy.Relevance:
        return "Relevance";
      case SortBy.Fields:
        return criterion.fields.map((field) => field.displayName).join(", ");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    controller.sortBy(JSON.parse(e.target.value));
  };

  const getValues = () => {
    return state.availableSorts.map((sort) => {
      return JSON.stringify(sort);
    });
  };

  return (
    <div className="Sort">
      <label htmlFor="sort-select">Sort by: </label>
      <select
        name="sorts"
        id="sorts-select"
        onChange={handleChange}
        value={
          JSON.stringify(state.appliedSort) ??
          JSON.stringify({ by: SortBy.Relevance })
        }
      >
        {getValues().map((sort, index) => (
          <option id="0" key={index} value={sort}>
            {getSortLabel(JSON.parse(sort))}
          </option>
        ))}
      </select>
    </div>
  );
}
