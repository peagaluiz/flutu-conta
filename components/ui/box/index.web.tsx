import React from 'react';
import { boxStyle } from './styles';
import { flattenWebStyle } from '../utils/flattenWebStyle';

import type { VariantProps } from '@gluestack-ui/nativewind-utils';

type IBoxProps = React.ComponentPropsWithoutRef<'div'> &
  VariantProps<typeof boxStyle> & { className?: string };

const Box = React.forwardRef<HTMLDivElement, IBoxProps>(function Box(
  { className, style, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={boxStyle({ class: className })}
      {...props}
      style={flattenWebStyle(style)}
    />
  );
});

Box.displayName = 'Box';
export { Box };
