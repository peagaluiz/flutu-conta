import React from 'react';
import type { VariantProps } from '@gluestack-ui/nativewind-utils';

import { vstackStyle } from './styles';
import { flattenWebStyle } from '../utils/flattenWebStyle';

type IVStackProps = React.ComponentProps<'div'> &
  VariantProps<typeof vstackStyle>;

const VStack = React.forwardRef<React.ComponentRef<'div'>, IVStackProps>(
  function VStack({ className, space, reversed, style, ...props }, ref) {
    return (
      <div
        className={vstackStyle({ space, reversed, class: className })}
        {...props}
        style={flattenWebStyle(style)}
        ref={ref}
      />
    );
  }
);

VStack.displayName = 'VStack';

export { VStack };
