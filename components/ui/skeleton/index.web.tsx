import React from 'react';
import { skeletonStyle, skeletonTextStyle } from './styles';
import { flattenWebStyle } from '../utils/flattenWebStyle';

import type { VariantProps } from '@gluestack-ui/nativewind-utils';

type ISkeletonProps = React.ComponentPropsWithoutRef<'div'> &
  VariantProps<typeof skeletonStyle> & {
    startColor?: string;
    isLoaded?: boolean;
  };

const Skeleton = React.forwardRef<HTMLDivElement, ISkeletonProps>(
  function Skeleton(
    {
      className,
      variant = 'rounded',
      children,
      speed = 2,
      startColor = 'bg-background-200',
      isLoaded = false,
      style,
      ...props
    },
    ref
  ) {
    if (!isLoaded) {
      return (
        <div
          ref={ref}
          className={`animate-pulse ${startColor} ${skeletonStyle({
            variant,
            speed,
            class: className,
          })}`}
          {...props}
          style={flattenWebStyle(style)}
        />
      );
    } else {
      return children;
    }
  }
);

type ISkeletonTextProps = React.ComponentPropsWithoutRef<'div'> &
  VariantProps<typeof skeletonTextStyle> & {
    _lines?: number;
    isLoaded?: boolean;
    startColor?: string;
  };

const SkeletonText = React.forwardRef<HTMLDivElement, ISkeletonTextProps>(
  function SkeletonText(
    {
      className,
      _lines,
      isLoaded = false,
      startColor = 'bg-background-200',
      gap = 2,
      children,
      style,
      ...props
    },
    ref
  ) {
    if (!isLoaded) {
      if (_lines) {
        return (
          <div
            ref={ref}
            className={`flex flex-col ${skeletonTextStyle({
              gap,
            })}`}
          >
            {Array.from({ length: _lines }).map((_, index) => (
              <div
                key={index}
                className={`animate-pulse ${startColor} ${skeletonTextStyle({
                  class: className,
                })}`}
                {...props}
                style={flattenWebStyle(style)}
              />
            ))}
          </div>
        );
      } else {
        return (
          <div
            ref={ref}
            className={`animate-pulse ${startColor} ${skeletonTextStyle({
              class: className,
            })}`}
            {...props}
            style={flattenWebStyle(style)}
          />
        );
      }
    } else {
      return children;
    }
  }
);

Skeleton.displayName = 'Skeleton';
SkeletonText.displayName = 'SkeletonText';

export { Skeleton, SkeletonText };
