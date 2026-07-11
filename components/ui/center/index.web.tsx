import React from 'react';
import { centerStyle } from './styles';

import type { VariantProps } from '@gluestack-ui/utils/nativewind-utils';
import { flattenWebStyle } from '../utils/flattenWebStyle';

type ICenterProps = React.ComponentPropsWithoutRef<'div'> &
  VariantProps<typeof centerStyle>;

const Center = React.forwardRef<HTMLDivElement, ICenterProps>(function Center(
  { className, style, ...props },
  ref
) {
  return (
    <div
      className={centerStyle({ class: className })}
      {...props}
      style={flattenWebStyle(style)}
      ref={ref}
    />
  );
});

Center.displayName = 'Center';

export { Center };
