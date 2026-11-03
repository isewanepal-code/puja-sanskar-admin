import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from 'cn';

import { Icon, type IconName } from '@/components/icons';

// One button for the whole admin: the same height, radius and focus ring everywhere.
const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'border border-border bg-card hover:bg-muted',
        ghost: 'hover:bg-muted',
        danger: 'text-destructive hover:bg-destructive/10',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-2.5 text-[0.8rem]',
        md: 'h-9 px-3.5',
        lg: 'h-10 px-4',
        icon: 'size-8',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

type ButtonProps = ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    icon?: IconName;
  };

function Button({ className, variant, size, icon, children, ...props }: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {icon ? <Icon name={icon} size={16} aria-hidden="true" /> : null}
      {children}
    </ButtonPrimitive>
  );
}

// A square button with only an icon; the label is read out, and shown on hover.
function IconButton({
  icon,
  label,
  variant = 'ghost',
  className,
  ...props
}: Omit<ButtonProps, 'children' | 'size'> & { icon: IconName; label: string }) {
  return (
    <Button
      size="icon"
      variant={variant}
      aria-label={label}
      title={label}
      className={className}
      {...props}
    >
      <Icon name={icon} size={16} aria-hidden="true" />
    </Button>
  );
}

export { Button, buttonVariants, IconButton };
