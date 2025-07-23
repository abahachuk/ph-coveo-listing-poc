import { NumericFacet as HeadlessNumericFacet } from "@coveo/headless/commerce";
import { useEffect, useState } from "react";
import "./numeric-facet-slider.css";

interface INumericFacetSliderProps {
  controller: HeadlessNumericFacet;
}

export default function NumericFacetSlider(props: INumericFacetSliderProps) {
  const { controller } = props;

  const [state, setState] = useState(controller.state);
  const [sliderValue, setSliderValue] = useState({
    start:
      controller.state.manualRange?.start ?? controller.state.domain?.min ?? 0,
    end:
      controller.state.manualRange?.end ?? controller.state.domain?.max ?? 100,
  });

  useEffect(() => {
    controller.subscribe(() => {
      setState(controller.state);
      setSliderValue({
        start:
          controller.state.manualRange?.start ??
          controller.state.domain?.min ??
          sliderValue.start,
        end:
          controller.state.manualRange?.end ??
          controller.state.domain?.max ??
          sliderValue.end,
      });
    });
  }, [controller]);

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    if (!isNaN(value)) {
      setSliderValue({
        ...sliderValue,
        start: value,
      });
    }
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    if (!isNaN(value)) {
      setSliderValue({
        ...sliderValue,
        end: value,
      });
    }
  };
  const handleApplyRange = () => {
    const start = Math.min(sliderValue.start, sliderValue.end);
    const end = Math.max(sliderValue.start, sliderValue.end);

    // Create a new range with all required properties
    const range = {
      start,
      end,
      endInclusive: true,
      state: "selected",
    };

    // console.log(range);

    // Set the range
    controller.setRanges([range]);
  };

  const handleClearSelections = () => {
    controller.deselectAll();
  };

  const currentMin = state.domain?.min ?? 0;
  const currentMax = state.domain?.max ?? 100;

  return (
    <fieldset className="NumericFacetSlider">
      <legend className="FacetDisplayName">
        {state.displayName ?? state.facetId}
      </legend>
      <div className="SliderContainer">
        <div className="SliderInputs">
          <div className="SliderInput">
            <label htmlFor={`${state.facetId}-start`}>From:</label>
            <input
              type="number"
              id={`${state.facetId}-start`}
              value={sliderValue.start}
              min={currentMin}
              max={currentMax}
              onChange={handleStartChange}
              disabled={state.isLoading}
            />
          </div>
          <div className="SliderInput">
            <label htmlFor={`${state.facetId}-end`}>To:</label>
            <input
              type="number"
              id={`${state.facetId}-end`}
              value={sliderValue.end}
              min={currentMin}
              max={currentMax}
              onChange={handleEndChange}
              disabled={state.isLoading}
            />
          </div>
        </div>{" "}
        <div
          className="SliderTrack"
          style={
            {
              "--range-start": `${
                ((sliderValue.start - currentMin) / (currentMax - currentMin)) *
                100
              }%`,
              "--range-end": `${
                100 -
                ((sliderValue.end - currentMin) / (currentMax - currentMin)) *
                  100
              }%`,
            } as React.CSSProperties
          }
        >
          <input
            type="range"
            min={currentMin}
            max={currentMax}
            value={sliderValue.start}
            onChange={handleStartChange}
            disabled={state.isLoading}
            className="RangeSliderStart"
          />
          <input
            type="range"
            min={currentMin}
            max={currentMax}
            value={sliderValue.end}
            onChange={handleEndChange}
            disabled={state.isLoading}
            className="RangeSliderEnd"
          />
        </div>
        <div className="SliderActions">
          <button
            className="ApplyButton"
            onClick={handleApplyRange}
            disabled={state.isLoading || sliderValue.start === sliderValue.end}
          >
            Apply Range
          </button>
          <button
            className="ClearButton"
            onClick={handleClearSelections}
            disabled={state.isLoading || !state.hasActiveValues}
          >
            Clear
          </button>
        </div>
      </div>
    </fieldset>
  );
}
