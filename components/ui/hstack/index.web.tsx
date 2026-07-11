import React from 'react';
import type { VariantProps } from '@gluestack-ui/nativewind-utils';
import { hstackStyle } from './styles';
import { flattenWebStyle } from '../utils/flattenWebStyle';

type IHStackProps = React.ComponentPropsWithoutRef<'div'> &
  VariantProps<typeof hstackStyle>;

const HStack = React.forwardRef<React.ComponentRef<'div'>, IHStackProps>(
  function HStack({ className, space, reversed, style, ...props }, ref) {
    return (
      <div
        className={hstackStyle({ space, reversed, class: className })}
        {...props}
        style={flattenWebStyle(style)}
        ref={ref}
      />
    );
  }
);

HStack.displayName = 'HStack';

export { HStack };
